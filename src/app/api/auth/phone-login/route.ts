import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createHash, createHmac } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, votes } from '@/lib/db/schema';
import { signToken } from '@/lib/auth/jwt';
import { logAuthEvent } from '@/lib/auth/auth-logger';
import {
  generateVEK, deriveKeyFromPassword, encryptVEK, decryptVEK,
  encryptParty, decryptParty,
} from '@/lib/crypto/vote-encryption';
import { generateRecoveryCodes, createRecoveryEntries } from '@/lib/crypto/recovery-codes';

export const dynamic = 'force-dynamic';

// In-memory rate limiter for failed login attempts
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): { blocked: boolean; remaining: number } {
  const entry = failedAttempts.get(key);
  if (!entry) return { blocked: false, remaining: MAX_ATTEMPTS };
  if (Date.now() > entry.lockedUntil) {
    failedAttempts.delete(key);
    return { blocked: false, remaining: MAX_ATTEMPTS };
  }
  if (entry.count >= MAX_ATTEMPTS) return { blocked: true, remaining: 0 };
  return { blocked: false, remaining: MAX_ATTEMPTS - entry.count };
}

function recordFailure(key: string) {
  const entry = failedAttempts.get(key);
  if (!entry) {
    failedAttempts.set(key, { count: 1, lockedUntil: Date.now() + LOCK_DURATION });
  } else {
    entry.count++;
    entry.lockedUntil = Date.now() + LOCK_DURATION;
  }
}

function clearFailures(key: string) {
  failedAttempts.delete(key);
}

// Cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of failedAttempts) {
      if (now > entry.lockedUntil) failedAttempts.delete(key);
    }
  }, 10 * 60 * 1000);
}

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json({ error: 'Telefon ve şifre gerekli' }, { status: 400 });
    }

    // Normalize phone: remove spaces, ensure 10 digits starting with 5
    const rawPhone = String(phone).replace(/\s/g, '');
    if (rawPhone.length !== 10 || !rawPhone.startsWith('5')) {
      return NextResponse.json({ error: 'Geçersiz telefon numarası' }, { status: 400 });
    }

    const IDENTITY_KEY = process.env.IDENTITY_KEY;
    const rawHash = createHash('sha256')
      .update((`+90${rawPhone}`).toLowerCase().trim())
      .digest('hex');
    const identityHash = IDENTITY_KEY
      ? createHmac('sha256', IDENTITY_KEY).update(Buffer.from(rawHash, 'hex')).digest('hex')
      : rawHash;

    // Rate limit check
    const rl = checkRateLimit(identityHash);
    if (rl.blocked) {
      return NextResponse.json(
        { error: 'Çok fazla başarısız deneme. 15 dakika bekleyin.' },
        { status: 429 }
      );
    }

    // Find user by identity_hash
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.identity_hash, identityHash))
      .limit(1);

    if (!user) {
      recordFailure(identityHash);
      await logAuthEvent({ eventType: 'login_fail', authMethod: 'phone', identityHint: `+90${rawPhone}`, request, errorCode: 'user_not_found' });
      return NextResponse.json({ error: 'Bu numarayla kayıtlı bir hesap bulunamadı. Henüz kayıt olmadıysanız ana sayfadan "Katıl" butonuyla kayıt olabilirsiniz.' }, { status: 401 });
    }

    if (!user.is_active) {
      // Tamamlanmamış kayıt mı? (city boş = profil hiç doldurulmamış)
      if (!user.city || user.city.trim() === '') {
        // Kullanıcıyı aktif et ve profil tamamlama akışına yönlendir
        await db.update(users).set({ is_active: true, updated_at: new Date() }).where(eq(users.id, user.id));
        // 401 döndür — client onRegistrationNeeded ile VoteModal'a yönlendirecek
        await logAuthEvent({ eventType: 'login_fail', authMethod: 'phone', identityHint: `+90${rawPhone}`, userId: user.id, request, errorCode: 'incomplete_registration' });
        return NextResponse.json({ error: 'Kayıt tamamlanmamış. Profil bilgilerinizi doldurun.', needsRegistration: true }, { status: 401 });
      }
      await logAuthEvent({ eventType: 'login_fail', authMethod: 'phone', identityHint: `+90${rawPhone}`, userId: user.id, request, errorCode: 'account_disabled' });
      return NextResponse.json({ error: 'Hesabınız devre dışı bırakılmıştır' }, { status: 403 });
    }

    // Check if password is set
    if (!user.password_hash) {
      return NextResponse.json({
        needsPassword: true,
        message: 'Şifre belirlemeniz gerekiyor. Telefonunuza doğrulama kodu göndereceğiz.',
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      recordFailure(identityHash);
      await logAuthEvent({ eventType: 'login_fail', authMethod: 'phone', identityHint: `+90${rawPhone}`, userId: user.id, request, errorCode: 'wrong_password' });
      return NextResponse.json({ error: 'Şifre hatalı' }, { status: 401 });
    }

    // Success — clear failures, update last_login
    clearFailures(identityHash);
    await db
      .update(users)
      .set({ last_login_at: new Date(), updated_at: new Date() })
      .where(eq(users.id, user.id));

    // --- VEK / Oy Şifreleme ---
    let vp: string | undefined;
    let vk: string | undefined;
    let recoveryCodes: string[] | undefined;
    let showRecoveryModal = false;

    if (user.vote_encryption_version === 1 && user.encrypted_vek) {
      // Şifreli kullanıcı — VEK decrypt et
      const derivedKey = deriveKeyFromPassword(password, user.id);
      const vek = decryptVEK(user.encrypted_vek, derivedKey);
      if (vek) {
        vk = vek.toString('base64');
        // Null party onarımı: encrypted_party varsa ama party null ise restore et
        const userVotesNullParty = await db
          .select()
          .from(votes)
          .where(and(eq(votes.user_id, user.id), sql`party IS NULL AND encrypted_party IS NOT NULL`));
        for (const v of userVotesNullParty) {
          const decrypted = decryptParty(v.encrypted_party!, vek);
          if (decrypted) {
            await db.update(votes).set({ party: decrypted }).where(eq(votes.id, v.id));
          }
        }
        // Mevcut oyu al
        const [currentVote] = await db
          .select({ party: votes.party, encrypted_party: votes.encrypted_party })
          .from(votes)
          .where(and(eq(votes.user_id, user.id), eq(votes.is_valid, true)))
          .orderBy(desc(votes.round_id))
          .limit(1);
        vp = currentVote?.party ?? (currentVote?.encrypted_party ? (decryptParty(currentVote.encrypted_party, vek) ?? undefined) : undefined);
      }
    } else if (user.vote_encryption_version === 0) {
      // Legacy kullanıcı — migration yap
      const vek = generateVEK();
      const derivedKey = deriveKeyFromPassword(password, user.id);
      const encryptedVek = encryptVEK(vek, derivedKey);
      vk = vek.toString('base64');

      // Mevcut oyları şifrele
      const userVotes = await db
        .select()
        .from(votes)
        .where(eq(votes.user_id, user.id));
      for (const vote of userVotes) {
        if (vote.party) {
          await db.update(votes).set({
            encrypted_party: encryptParty(vote.party, vek),
            party: null,
          }).where(eq(votes.id, vote.id));
        }
      }
      // En son oyun partisini al (decrypt)
      if (userVotes.length > 0) {
        const latest = userVotes.sort((a, b) => b.round_id - a.round_id)[0];
        vp = latest.party ?? undefined;
      }

      // Recovery codes oluştur
      const codes = generateRecoveryCodes(8);
      recoveryCodes = codes;
      showRecoveryModal = true;

      await db.update(users).set({
        encrypted_vek: encryptedVek,
        recovery_codes: createRecoveryEntries(codes, vek),
        vote_encryption_version: 1,
        recovery_codes_confirmed: false,
        recovery_codes_generated_at: new Date(),
        updated_at: new Date(),
      }).where(eq(users.id, user.id));
    }

    const token = signToken({ userId: user.id, vp, vk, st: user.subscription_tier || 'free' });

    await logAuthEvent({ eventType: 'login', authMethod: 'phone', identityHint: `+90${rawPhone}`, userId: user.id, request });

    return NextResponse.json({
      token,
      isNewUser: false,
      ...(recoveryCodes && { recoveryCodes }),
      ...(showRecoveryModal && { showRecoveryModal: true }),
      user: {
        id: user.id,
        city: user.city,
        district: user.district,
        referral_code: user.referral_code,
      },
    });
  } catch (error) {
    console.error('Phone login error:', error);
    return NextResponse.json({ error: 'Giriş sırasında bir hata oluştu' }, { status: 500 });
  }
}
