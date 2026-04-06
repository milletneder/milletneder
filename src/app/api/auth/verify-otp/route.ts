import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { markPhoneAsVerified } from '@/lib/auth/phone-otp-store';
import { checkVerification, getEffectiveProviderName } from '@/lib/sms/provider';
import { hashIdentity, loginExistingUser } from '@/lib/auth/registration';
import { logAuthEvent } from '@/lib/auth/auth-logger';
import { logSmsSend } from '@/lib/sms/sms-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { phone, code, password } = await request.json();

    // Validate
    const raw = String(phone || '').replace(/\s/g, '');
    if (raw.length !== 10 || !raw.startsWith('5')) {
      return NextResponse.json({ error: 'Geçersiz telefon numarası' }, { status: 400 });
    }
    if (!code || String(code).length !== 6) {
      return NextResponse.json({ error: '6 haneli doğrulama kodunu girin' }, { status: 400 });
    }

    const fullPhone = `+90${raw}`;

    // Efektif sağlayıcı adını al (loglama için)
    const providerName = await getEffectiveProviderName();

    // Verify OTP via active provider
    const result = await checkVerification(fullPhone, String(code));
    if (!result.valid) {
      const errorMessages: Record<string, string> = {
        no_code: 'Doğrulama kodu bulunamadı. Tekrar kod gönderin.',
        expired: 'Doğrulama kodunun süresi doldu. Tekrar kod gönderin.',
        too_many_attempts: 'Çok fazla hatalı deneme. Tekrar kod gönderin.',
        invalid_code: 'Hatalı doğrulama kodu.',
      };
      await logAuthEvent({ eventType: 'login_fail', authMethod: 'phone', identityHint: fullPhone, request, errorCode: `otp_${result.error}`, details: { sms_provider: providerName } });
      return NextResponse.json({ error: errorMessages[result.error!] || 'Doğrulama başarısız' }, { status: 400 });
    }

    // OTP doğrulandı — SMS doğrulama logla
    await logSmsSend({ provider: providerName, phone: fullPhone, status: 'sent' });

    // OTP valid — mark phone as verified
    markPhoneAsVerified(fullPhone);

    // Check if user exists
    const identityHash = hashIdentity(fullPhone);
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.identity_hash, identityHash))
      .limit(1);

    if (existingUser) {
      const isIncomplete = !existingUser.city || existingUser.city.trim() === '';

      if (!existingUser.is_active && isIncomplete) {
        // OTP doğrulandı ama profil eksik — register tamamlanınca register logu düşer
        await logAuthEvent({ eventType: 'otp_verified', authMethod: 'phone', identityHint: fullPhone, userId: existingUser.id, request, details: { sms_provider: providerName, step: 'incomplete_profile' } });
        return NextResponse.json({ isNewUser: true, authProvider: 'phone', verified: true });
      }

      if (!existingUser.is_active) {
        await logAuthEvent({ eventType: 'login_fail', authMethod: 'phone', identityHint: fullPhone, userId: existingUser.id, request, errorCode: 'account_disabled', details: { sms_provider: providerName } });
        return NextResponse.json({ error: 'Hesabınız devre dışı bırakılmıştır' }, { status: 403 });
      }

      if (isIncomplete) {
        await logAuthEvent({ eventType: 'otp_verified', authMethod: 'phone', identityHint: fullPhone, userId: existingUser.id, request, details: { sms_provider: providerName, step: 'incomplete_profile' } });
        return NextResponse.json({ isNewUser: true, authProvider: 'phone', verified: true });
      }

      // Existing complete user — login
      const loginResult = await loginExistingUser(existingUser, {
        identityValue: fullPhone,
        authProvider: 'phone',
        password: password ? String(password) : undefined,
        request,
      });

      return NextResponse.json(loginResult);
    }

    // Yeni kullanıcı — telefon doğrulandı, kayıt bekleniyor
    await logAuthEvent({ eventType: 'otp_verified', authMethod: 'phone', identityHint: fullPhone, request, details: { sms_provider: providerName, step: 'new_user' } });
    return NextResponse.json({ isNewUser: true, authProvider: 'phone', verified: true });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Doğrulama sırasında bir hata oluştu' }, { status: 500 });
  }
}
