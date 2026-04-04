import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createHash, createHmac } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, deviceLogs, votes, rounds, anonymousVoteCounts } from '@/lib/db/schema';
import { signToken } from '@/lib/auth/jwt';
import { getAdminAuth } from '@/lib/firebase/admin';
import { logAuthEvent } from '@/lib/auth/auth-logger';
import {
  MAX_REGISTRATIONS_PER_IP,
  IP_RATE_LIMIT_WINDOW_MINUTES,
  REFERRAL_CODE_LENGTH,
} from '@/lib/constants';
import { isIPWhitelisted } from '@/lib/auth/admin-ip-whitelist';
import {
  generateVEK, deriveKeyFromPassword, encryptVEK, decryptVEK,
  encryptParty, decryptParty,
} from '@/lib/crypto/vote-encryption';
import { generateRecoveryCodes, createRecoveryEntries } from '@/lib/crypto/recovery-codes';

function hashIdentity(value: string): string {
  const raw = createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
  const IDENTITY_KEY = process.env.IDENTITY_KEY;
  if (IDENTITY_KEY) {
    return createHmac('sha256', IDENTITY_KEY).update(Buffer.from(raw, 'hex')).digest('hex');
  }
  return raw;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseIdToken, city, district, fingerprint, referralCode, party, roundId, password, recoveryEmail } = body;

    if (!firebaseIdToken) {
      return NextResponse.json({ error: 'Firebase token gerekli' }, { status: 400 });
    }

    // Firebase token dogrula
    const adminAuth = getAdminAuth();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(firebaseIdToken);
    } catch (err) {
      console.error('Firebase token verification failed:', err);
      await logAuthEvent({ eventType: 'login_fail', request, errorCode: 'token_invalid', errorMessage: 'Firebase token doğrulanamadı' });
      return NextResponse.json({ error: 'Kimlik doğrulama başarısız. Lütfen tekrar deneyin.' }, { status: 401 });
    }

    const firebaseUid = decodedToken.uid;
    const authProvider = decodedToken.firebase?.sign_in_provider === 'phone' ? 'phone' : 'email';
    const identityValue = decodedToken.email || decodedToken.phone_number || firebaseUid;
    const identityHash = hashIdentity(identityValue);

    // Mevcut kullanici var mi? (identity_hash ile ara — firebase_uid DB'de saklanmıyor)
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.identity_hash, identityHash))
      .limit(1);

    if (existingUser) {
      // Tamamlanmamış kayıt — profil bilgileri eksik
      const isIncomplete = !existingUser.city || existingUser.city.trim() === '';

      if (!existingUser.is_active) {
        if (isIncomplete) {
          // Tamamlanmamış kayıt — city geliyorsa tamamla, gelmiyorsa yönlendir
          if (!city) {
            await logAuthEvent({ eventType: 'register_incomplete', authMethod: authProvider, identityHint: identityValue, userId: existingUser.id, request, errorCode: 'incomplete_registration' });
            return NextResponse.json({ isNewUser: true, authProvider });
          }
          // city geldi — aşağıda profil tamamlama akışına devam edecek
          await db.update(users).set({ is_active: true, updated_at: new Date() }).where(eq(users.id, existingUser.id));
          existingUser.is_active = true;
        } else {
          // Gerçekten devre dışı bırakılmış hesap
          await logAuthEvent({ eventType: 'login_fail', authMethod: authProvider, identityHint: identityValue, userId: existingUser.id, request, errorCode: 'account_disabled' });
          return NextResponse.json({ error: 'Hesabiniz devre disi birakilmistir' }, { status: 403 });
        }
      }

      // Tamamlanmamış kayıt + profil bilgileri geldi → kayıt tamamla
      if (isIncomplete && city) {
        if (!district) {
          return NextResponse.json({ error: 'İlçe seçimi gerekli' }, { status: 400 });
        }
        if (!party) {
          return NextResponse.json({ error: 'Parti seçimi gerekli' }, { status: 400 });
        }

        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';

        // Profil bilgilerini güncelle
        const shouldFlag = false;
        const cityStr = String(city).trim();
        const districtStr = String(district).trim();
        let passwordHash: string | null = existingUser.password_hash;
        if (password && String(password).length >= 6 && !passwordHash) {
          passwordHash = await bcrypt.hash(String(password), 10);
        }

        // VEK + Recovery Codes
        let vek: Buffer | null = null;
        let encryptedVek: string | null = null;
        let recoveryCodesData: ReturnType<typeof createRecoveryEntries> | null = null;
        let recoveryCodes: string[] | undefined;
        let showRecoveryModal = false;

        if (passwordHash && password && !existingUser.encrypted_vek) {
          vek = generateVEK();
          const derivedKey = deriveKeyFromPassword(String(password), existingUser.id);
          encryptedVek = encryptVEK(vek, derivedKey);
          const codes = generateRecoveryCodes(8);
          recoveryCodes = codes;
          recoveryCodesData = createRecoveryEntries(codes, vek);
          showRecoveryModal = true;
        }

        // Referral
        let referred_by: number | null = existingUser.referred_by;
        if (!referred_by && referralCode) {
          const [referrer] = await db.select({ id: users.id }).from(users).where(eq(users.referral_code, String(referralCode))).limit(1);
          if (referrer) referred_by = referrer.id;
        }

        // Referral code yoksa oluştur
        let refCode = existingUser.referral_code;
        if (!refCode) {
          refCode = nanoid(REFERRAL_CODE_LENGTH);
        }

        const profileUpdate: Record<string, unknown> = {
          city: cityStr,
          district: districtStr,
          is_active: true,
          password_hash: passwordHash,
          referral_code: refCode,
          referred_by,
          last_login_at: new Date(),
          updated_at: new Date(),
        };
        if (encryptedVek) {
          profileUpdate.encrypted_vek = encryptedVek;
          profileUpdate.recovery_codes = recoveryCodesData;
          profileUpdate.vote_encryption_version = 1;
          profileUpdate.recovery_codes_confirmed = false;
          profileUpdate.recovery_codes_generated_at = new Date();
        }

        await db.update(users).set(profileUpdate).where(eq(users.id, existingUser.id));

        // Device log
        await db.insert(deviceLogs).values({
          user_id: existingUser.id,
          fingerprint: fingerprint ? String(fingerprint) : null,
          ip_address: ip,
          user_agent: request.headers.get('user-agent') ?? null,
        });

        // Transaction log
        await db.execute(sql`
          INSERT INTO vote_transaction_log (tx_type, round_id, city, district, is_valid, is_dummy, created_at)
          VALUES ('KAYIT', 0, ${cityStr}, ${districtStr}, NULL, false, NOW())
        `);

        // Oy verme
        let vp: string | undefined;
        if (party) {
          const [activeRound] = await db.select().from(rounds).where(eq(rounds.is_active, true)).limit(1);
          if (activeRound) {
            const partyStr = String(party);
            const encryptedParty = vek ? encryptParty(partyStr, vek) : null;
            await db.insert(votes).values({
              user_id: existingUser.id,
              round_id: activeRound.id,
              party: vek ? null : partyStr,
              encrypted_party: encryptedParty,
              city: cityStr,
              district: districtStr,
              is_valid: !shouldFlag,
            });
            await db.execute(sql`
              INSERT INTO vote_transaction_log (tx_type, round_id, city, district, party, is_valid, is_dummy, created_at)
              VALUES ('OY_KULLANIM', ${activeRound.id}, ${cityStr}, ${districtStr}, ${partyStr}, ${!shouldFlag}, false, NOW())
            `);
            await db.execute(sql`
              INSERT INTO anonymous_vote_counts (round_id, party, city, district, age_bracket, gender, education, income_bracket, turnout_intention, previous_vote_2023, is_valid, is_dummy, vote_count)
              VALUES (${activeRound.id}, ${partyStr}, ${cityStr}, ${districtStr}, NULL, NULL, NULL, NULL, NULL, NULL, ${!shouldFlag}, false, 1)
              ON CONFLICT (round_id, party, city, COALESCE(district,''), COALESCE(age_bracket,''), COALESCE(gender,''), COALESCE(education,''), COALESCE(income_bracket,''), COALESCE(turnout_intention,''), COALESCE(previous_vote_2023,''), is_valid, is_dummy)
              DO UPDATE SET vote_count = anonymous_vote_counts.vote_count + 1
            `);
            vp = partyStr;
          }
        }

        const vkBase64 = vek ? vek.toString('base64') : undefined;
        const token = signToken({ userId: existingUser.id, vp, vk: vkBase64 });

        await logAuthEvent({ eventType: 'register', authMethod: authProvider, identityHint: identityValue, userId: existingUser.id, request, details: { city: cityStr, district: districtStr, completedIncomplete: true } });

        return NextResponse.json({
          token,
          isNewUser: true,
          ...(recoveryCodes && { recoveryCodes }),
          ...(showRecoveryModal && { showRecoveryModal: true }),
          user: {
            id: existingUser.id,
            city: cityStr,
            district: districtStr,
            referral_code: refCode,
          },
          referralLink: `https://milletneder.com?ref=${refCode}`,
        }, { status: 201 });
      }

      // Normal LOGIN akışı
      if (isIncomplete && !city) {
        // Aktif ama city boş — profil tamamlama gerekiyor
        await logAuthEvent({ eventType: 'register_incomplete', authMethod: authProvider, identityHint: identityValue, userId: existingUser.id, request });
        return NextResponse.json({ isNewUser: true, authProvider });
      }

      const updateData: Record<string, unknown> = { last_login_at: new Date(), updated_at: new Date() };
      // Mevcut kullanıcı şifre belirliyor (migration flow)
      if (password && String(password).length >= 6 && !existingUser.password_hash) {
        updateData.password_hash = await bcrypt.hash(String(password), 10);
      }

      // --- VEK / Oy Şifreleme ---
      let vp: string | undefined;
      let vk: string | undefined;
      let recoveryCodes: string[] | undefined;
      let showRecoveryModal = false;
      const pwd = password ? String(password) : undefined;

      if (existingUser.vote_encryption_version === 1 && existingUser.encrypted_vek && pwd) {
        // Şifreli kullanıcı — VEK decrypt
        const derivedKey = deriveKeyFromPassword(pwd, existingUser.id);
        const vek = decryptVEK(existingUser.encrypted_vek, derivedKey);
        if (vek) {
          vk = vek.toString('base64');
          // Null party onarımı: encrypted_party varsa ama party null ise restore et
          const nullPartyVotes = await db
            .select()
            .from(votes)
            .where(and(eq(votes.user_id, existingUser.id), sql`party IS NULL AND encrypted_party IS NOT NULL`));
          for (const v of nullPartyVotes) {
            const decrypted = decryptParty(v.encrypted_party!, vek);
            if (decrypted) {
              await db.update(votes).set({ party: decrypted }).where(eq(votes.id, v.id));
            }
          }
          // Mevcut oyu al
          const [currentVote] = await db
            .select({ party: votes.party, encrypted_party: votes.encrypted_party })
            .from(votes)
            .where(and(eq(votes.user_id, existingUser.id), eq(votes.is_valid, true)))
            .orderBy(desc(votes.round_id))
            .limit(1);
          vp = currentVote?.party ?? (currentVote?.encrypted_party ? (decryptParty(currentVote.encrypted_party, vek) ?? undefined) : undefined);
        }
      } else if (existingUser.vote_encryption_version === 0 && pwd) {
        // Legacy kullanıcı — migration
        const vek = generateVEK();
        const derivedKey = deriveKeyFromPassword(pwd, existingUser.id);
        vk = vek.toString('base64');

        // Mevcut oyları şifrele
        const userVotes = await db.select().from(votes).where(eq(votes.user_id, existingUser.id));
        for (const vote of userVotes) {
          if (vote.party) {
            await db.update(votes).set({
              encrypted_party: encryptParty(vote.party, vek),
              party: null,
            }).where(eq(votes.id, vote.id));
          }
        }
        if (userVotes.length > 0) {
          const latest = userVotes.sort((a, b) => b.round_id - a.round_id)[0];
          vp = latest.party ?? undefined;
        }

        // Recovery codes
        const codes = generateRecoveryCodes(8);
        recoveryCodes = codes;
        showRecoveryModal = true;

        updateData.encrypted_vek = encryptVEK(vek, derivedKey);
        updateData.recovery_codes = createRecoveryEntries(codes, vek);
        updateData.vote_encryption_version = 1;
        updateData.recovery_codes_confirmed = false;
        updateData.recovery_codes_generated_at = new Date();
      }

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, existingUser.id));

      const token = signToken({ userId: existingUser.id, vp, vk });

      await logAuthEvent({ eventType: 'login', authMethod: authProvider, identityHint: identityValue, userId: existingUser.id, request });

      return NextResponse.json({
        token,
        isNewUser: false,
        ...(recoveryCodes && { recoveryCodes }),
        ...(showRecoveryModal && { showRecoveryModal: true }),
        user: {
          id: existingUser.id,
          city: existingUser.city,
          district: existingUser.district,
          referral_code: existingUser.referral_code,
        },
      });
    }

    // REGISTER — yeni kullanici
    if (!city) {
      // Profil bilgisi henuz verilmemis — client'a yeni kullanici oldugunu bildir
      await logAuthEvent({ eventType: 'register_incomplete', authMethod: authProvider, identityHint: identityValue, request });
      return NextResponse.json({
        isNewUser: true,
        authProvider,
      });
    }

    if (!district) {
      return NextResponse.json({ error: 'İlçe seçimi gerekli' }, { status: 400 });
    }

    if (!party) {
      return NextResponse.json({ error: 'Parti seçimi gerekli' }, { status: 400 });
    }

    // IP rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    const windowStart = new Date(Date.now() - IP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const [ipCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(deviceLogs)
      .where(and(eq(deviceLogs.ip_address, ip), gte(deviceLogs.created_at, windowStart)));

    if (ipCount && ipCount.count >= MAX_REGISTRATIONS_PER_IP && !isIPWhitelisted(ip)) {
      await logAuthEvent({ eventType: 'register_blocked', authMethod: authProvider, identityHint: identityValue, request, errorCode: 'ip_rate_limit', errorMessage: `IP başına kayıt limiti aşıldı (${ipCount.count})` });
      return NextResponse.json(
        { error: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    // Fingerprint — sadece device log için kaydedilir, flag/block yapılmaz
    // (False positive oranı çok yüksek — farklı cihazlar aynı fingerprint üretiyor)
    const shouldFlag = false;

    // Referral code kontrol
    let referred_by: number | null = null;
    if (referralCode) {
      const [referrer] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.referral_code, String(referralCode)))
        .limit(1);
      if (referrer) referred_by = referrer.id;
    }

    // Password hash (phone users set password during registration)
    let passwordHash: string | null = null;
    if (password && String(password).length >= 6) {
      passwordHash = await bcrypt.hash(String(password), 10);
    }

    // VEK + Recovery Codes oluştur (şifre varsa)
    let vek: Buffer | null = null;
    let encryptedVek: string | null = null;
    let recoveryCodesData: ReturnType<typeof createRecoveryEntries> | null = null;
    let recoveryCodes: string[] | undefined;
    let showRecoveryModal = false;

    if (passwordHash && password) {
      vek = generateVEK();
      // Not: userId henüz yok, insert'ten sonra güncellenecek
    }

    // Kullanici olustur (firebase_uid olarak anonim rastgele ID kullan — gerçek UID saklanmıyor)
    const referral_code = nanoid(REFERRAL_CODE_LENGTH);
    const anonUid = `anon_${nanoid(32)}`;
    const [newUser] = await db
      .insert(users)
      .values({
        firebase_uid: anonUid,
        identity_hash: identityHash,
        city: String(city).trim(),
        district: String(district).trim(),
        referral_code,
        referred_by,
        auth_provider: authProvider,
        is_flagged: false,
        flag_reason: null,
        password_hash: passwordHash,
        recovery_email_hash: null,
        vote_encryption_version: vek ? 1 : 0,
      })
      .returning();

    // VEK'i userId ile şifrele (artık userId var)
    if (vek && password) {
      const derivedKey = deriveKeyFromPassword(String(password), newUser.id);
      encryptedVek = encryptVEK(vek, derivedKey);
      const codes = generateRecoveryCodes(8);
      recoveryCodes = codes;
      recoveryCodesData = createRecoveryEntries(codes, vek);
      showRecoveryModal = true;

      await db.update(users).set({
        encrypted_vek: encryptedVek,
        recovery_codes: recoveryCodesData,
        recovery_codes_confirmed: false,
        recovery_codes_generated_at: new Date(),
      }).where(eq(users.id, newUser.id));
    }

    // Transaction log'a KAYIT yaz (kullanıcı kimliği olmadan)
    await db.execute(sql`
      INSERT INTO vote_transaction_log (tx_type, round_id, city, district, is_valid, is_dummy, created_at)
      VALUES ('KAYIT', 0, ${city}, ${district}, NULL, false, NOW())
    `);

    // Device log
    await db.insert(deviceLogs).values({
      user_id: newUser.id,
      fingerprint: fingerprint ? String(fingerprint) : null,
      ip_address: ip,
      user_agent: request.headers.get('user-agent') ?? null,
    });

    // Kayit sirasinda oy ver
    let vp: string | undefined;
    if (party) {
      const [activeRound] = await db
        .select()
        .from(rounds)
        .where(eq(rounds.is_active, true))
        .limit(1);

      if (activeRound) {
        const partyStr = String(party);
        const encryptedParty = vek ? encryptParty(partyStr, vek) : null;

        const cityStr = String(city).trim();
        const districtStr = String(district).trim();

        await db.insert(votes).values({
          user_id: newUser.id,
          round_id: activeRound.id,
          party: vek ? null : partyStr,
          encrypted_party: encryptedParty,
          city: cityStr,
          district: districtStr,
          is_valid: !shouldFlag,
        });

        // Transaction log'a OY_KULLANIM yaz
        await db.execute(sql`
          INSERT INTO vote_transaction_log (tx_type, round_id, city, district, party, is_valid, is_dummy, created_at)
          VALUES ('OY_KULLANIM', ${activeRound.id}, ${cityStr}, ${districtStr}, ${partyStr}, ${!shouldFlag}, false, NOW())
        `);

        // Anonymous vote counts — demografik bilgilerle birlikte
        const ub = newUser;
        await db.execute(sql`
          INSERT INTO anonymous_vote_counts (round_id, party, city, district, age_bracket, gender, education, income_bracket, turnout_intention, previous_vote_2023, is_valid, is_dummy, vote_count)
          VALUES (${activeRound.id}, ${partyStr}, ${cityStr}, ${districtStr}, ${ub.age_bracket}, ${ub.gender}, ${ub.education}, ${ub.income_bracket}, ${ub.turnout_intention}, ${ub.previous_vote_2023}, ${!shouldFlag}, false, 1)
          ON CONFLICT (round_id, party, city, COALESCE(district,''), COALESCE(age_bracket,''), COALESCE(gender,''), COALESCE(education,''), COALESCE(income_bracket,''), COALESCE(turnout_intention,''), COALESCE(previous_vote_2023,''), is_valid, is_dummy)
          DO UPDATE SET vote_count = anonymous_vote_counts.vote_count + 1
        `);

        vp = partyStr;
      }
    }

    const vkBase64 = vek ? vek.toString('base64') : undefined;
    const token = signToken({ userId: newUser.id, vp, vk: vkBase64 });

    await logAuthEvent({ eventType: 'register', authMethod: authProvider, identityHint: identityValue, userId: newUser.id, request, details: { city, district, flagged: shouldFlag } });

    return NextResponse.json(
      {
        token,
        isNewUser: true,
        ...(recoveryCodes && { recoveryCodes }),
        ...(showRecoveryModal && { showRecoveryModal: true }),
        user: {
          id: newUser.id,
          city: newUser.city,
          district: newUser.district,
          referral_code: newUser.referral_code,
        },
        referralLink: `https://milletneder.com?ref=${newUser.referral_code}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Firebase auth error:', error);
    await logAuthEvent({ eventType: 'login_fail', request, errorCode: 'server_error', errorMessage: String(error) });
    return NextResponse.json(
      { error: 'Kimlik doğrulama sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}
