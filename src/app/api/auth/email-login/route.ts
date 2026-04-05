import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, votes } from '@/lib/db/schema';
import { signToken } from '@/lib/auth/jwt';
import { hashIdentity } from '@/lib/auth/registration';
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
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre gerekli' }, { status: 400 });
    }

    const trimmedEmail = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Geçersiz e-posta adresi' }, { status: 400 });
    }

    const identityHash = hashIdentity(trimmedEmail);

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
      await logAuthEvent({ eventType: 'login_fail', authMethod: 'email', identityHint: trimmedEmail, request, errorCode: 'user_not_found' });
      return NextResponse.json({ error: 'Bu e-posta ile kayıtlı hesap bulunamadı.' }, { status: 401 });
    }

    if (!user.is_active) {
      if (!user.city || user.city.trim() === '') {
        await db.update(users).set({ is_active: true, updated_at: new Date() }).where(eq(users.id, user.id));
        await logAuthEvent({ eventType: 'login_fail', authMethod: 'email', identityHint: trimmedEmail, userId: user.id, request, errorCode: 'incomplete_registration' });
        return NextResponse.json({ error: 'Kayıt tamamlanmamış. Profil bilgilerinizi doldurun.', needsRegistration: true }, { status: 401 });
      }
      await logAuthEvent({ eventType: 'login_fail', authMethod: 'email', identityHint: trimmedEmail, userId: user.id, request, errorCode: 'account_disabled' });
      return NextResponse.json({ error: 'Hesabınız devre dışı bırakılmıştır' }, { status: 403 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ error: 'Şifre hatalı' }, { status: 401 });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      recordFailure(identityHash);
      await logAuthEvent({ eventType: 'login_fail', authMethod: 'email', identityHint: trimmedEmail, userId: user.id, request, errorCode: 'wrong_password' });
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
      const derivedKey = deriveKeyFromPassword(password, user.id);
      const vek = decryptVEK(user.encrypted_vek, derivedKey);
      if (vek) {
        vk = vek.toString('base64');
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
        const [currentVote] = await db
          .select({ party: votes.party, encrypted_party: votes.encrypted_party })
          .from(votes)
          .where(and(eq(votes.user_id, user.id), eq(votes.is_valid, true)))
          .orderBy(desc(votes.round_id))
          .limit(1);
        vp = currentVote?.party ?? (currentVote?.encrypted_party ? (decryptParty(currentVote.encrypted_party, vek) ?? undefined) : undefined);
      }
    } else if (user.vote_encryption_version === 0) {
      // Legacy kullanıcı — migration
      const vek = generateVEK();
      const derivedKey = deriveKeyFromPassword(password, user.id);
      const encryptedVek = encryptVEK(vek, derivedKey);
      vk = vek.toString('base64');

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
      if (userVotes.length > 0) {
        const latest = userVotes.sort((a, b) => b.round_id - a.round_id)[0];
        vp = latest.party ?? undefined;
      }

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

    const token = signToken({ userId: user.id, vp, vk });

    await logAuthEvent({ eventType: 'login', authMethod: 'email', identityHint: trimmedEmail, userId: user.id, request });

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
    console.error('Email login error:', error);
    return NextResponse.json({ error: 'Giriş sırasında bir hata oluştu' }, { status: 500 });
  }
}
