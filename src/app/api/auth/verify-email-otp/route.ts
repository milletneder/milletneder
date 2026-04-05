import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { markEmailAsVerified } from '@/lib/auth/phone-otp-store';
import { checkVerification } from '@/lib/sms/twilio';
import { hashIdentity, loginExistingUser } from '@/lib/auth/registration';
import { logAuthEvent } from '@/lib/auth/auth-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, code, password } = await request.json();

    // Validate email
    const trimmed = String(email || '').trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Geçersiz e-posta adresi' }, { status: 400 });
    }
    if (!code || String(code).length !== 6) {
      return NextResponse.json({ error: '6 haneli doğrulama kodunu girin' }, { status: 400 });
    }

    // Verify OTP via Twilio Verify API (email channel)
    const result = await checkVerification(trimmed, String(code), 'email');
    if (!result.valid) {
      const errorMessages: Record<string, string> = {
        no_code: 'Doğrulama kodu bulunamadı. Tekrar kod gönderin.',
        expired: 'Doğrulama kodunun süresi doldu. Tekrar kod gönderin.',
        too_many_attempts: 'Çok fazla hatalı deneme. Tekrar kod gönderin.',
        invalid_code: 'Hatalı doğrulama kodu.',
      };
      await logAuthEvent({ eventType: 'login_fail', authMethod: 'email', identityHint: trimmed, request, errorCode: `otp_${result.error}` });
      return NextResponse.json({ error: errorMessages[result.error!] || 'Doğrulama başarısız' }, { status: 400 });
    }

    // OTP valid — mark email as verified
    markEmailAsVerified(trimmed);

    // Check if user exists
    const identityHash = hashIdentity(trimmed);
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.identity_hash, identityHash))
      .limit(1);

    if (existingUser) {
      const isIncomplete = !existingUser.city || existingUser.city.trim() === '';

      if (!existingUser.is_active && isIncomplete) {
        // Incomplete registration — needs profile
        await logAuthEvent({ eventType: 'register_incomplete', authMethod: 'email', identityHint: trimmed, userId: existingUser.id, request });
        return NextResponse.json({ isNewUser: true, authProvider: 'email', verified: true });
      }

      if (!existingUser.is_active) {
        await logAuthEvent({ eventType: 'login_fail', authMethod: 'email', identityHint: trimmed, userId: existingUser.id, request, errorCode: 'account_disabled' });
        return NextResponse.json({ error: 'Hesabınız devre dışı bırakılmıştır' }, { status: 403 });
      }

      if (isIncomplete) {
        await logAuthEvent({ eventType: 'register_incomplete', authMethod: 'email', identityHint: trimmed, userId: existingUser.id, request });
        return NextResponse.json({ isNewUser: true, authProvider: 'email', verified: true });
      }

      // Existing complete user — login
      const loginResult = await loginExistingUser(existingUser, {
        identityValue: trimmed,
        authProvider: 'email',
        password: password ? String(password) : undefined,
        request,
      });

      return NextResponse.json(loginResult);
    }

    // New user — email verified, needs registration
    await logAuthEvent({ eventType: 'register_incomplete', authMethod: 'email', identityHint: trimmed, request, details: { step: 'otp_verified_new_user' } });
    return NextResponse.json({ isNewUser: true, authProvider: 'email', verified: true });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    return NextResponse.json({ error: 'Doğrulama sırasında bir hata oluştu' }, { status: 500 });
  }
}
