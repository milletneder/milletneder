/**
 * Firebase Phone Auth — Sunucu Tarafı Doğrulama
 *
 * İstemci tarafında Firebase signInWithPhoneNumber ile doğrulanmış
 * kullanıcının ID token'ını alır, doğrular ve kendi JWT'mizi verir.
 *
 * Bu endpoint, verify-otp ile aynı kullanıcı oluşturma/giriş mantığını kullanır.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { markPhoneAsVerified } from '@/lib/auth/phone-otp-store';
import { verifyFirebaseIdToken } from '@/lib/sms/firebase';
import { hashIdentity, loginExistingUser } from '@/lib/auth/registration';
import { logAuthEvent } from '@/lib/auth/auth-logger';
import { logSmsSend } from '@/lib/sms/sms-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { idToken, password } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Firebase ID token gerekli' }, { status: 400 });
    }

    // Firebase ID token'ını doğrula
    let phoneNumber: string;
    try {
      const result = await verifyFirebaseIdToken(idToken);
      phoneNumber = result.phoneNumber;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[FIREBASE] Token verification failed:', errMsg);
      await logAuthEvent({
        eventType: 'login_fail',
        authMethod: 'phone',
        identityHint: 'firebase_token',
        request,
        errorCode: 'firebase_token_invalid',
        errorMessage: errMsg,
      });
      return NextResponse.json({ error: 'Doğrulama başarısız. Lütfen tekrar deneyin.' }, { status: 400 });
    }

    // Firebase +90 formatında verir
    const fullPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    // Firebase üzerinden başarıyla SMS gönderildi ve doğrulandı — logla
    await logSmsSend({ provider: 'firebase', phone: fullPhone, status: 'sent' });

    // Telefonu doğrulanmış olarak işaretle (register-phone endpoint'i için gerekli)
    markPhoneAsVerified(fullPhone);

    // Kullanıcı var mı kontrol et — verify-otp ile aynı mantık
    const identityHash = hashIdentity(fullPhone);
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.identity_hash, identityHash))
      .limit(1);

    if (existingUser) {
      const isIncomplete = !existingUser.city || existingUser.city.trim() === '';

      if (!existingUser.is_active && isIncomplete) {
        await logAuthEvent({ eventType: 'otp_verified', authMethod: 'phone', identityHint: fullPhone, userId: existingUser.id, request, details: { sms_provider: 'firebase', step: 'incomplete_profile' } });
        return NextResponse.json({ isNewUser: true, authProvider: 'phone', verified: true });
      }

      if (!existingUser.is_active) {
        await logAuthEvent({ eventType: 'login_fail', authMethod: 'phone', identityHint: fullPhone, userId: existingUser.id, request, errorCode: 'account_disabled', details: { sms_provider: 'firebase' } });
        return NextResponse.json({ error: 'Hesabınız devre dışı bırakılmıştır' }, { status: 403 });
      }

      if (isIncomplete) {
        await logAuthEvent({ eventType: 'otp_verified', authMethod: 'phone', identityHint: fullPhone, userId: existingUser.id, request, details: { sms_provider: 'firebase', step: 'incomplete_profile' } });
        return NextResponse.json({ isNewUser: true, authProvider: 'phone', verified: true });
      }

      // Mevcut kullanıcı — giriş yap
      const loginResult = await loginExistingUser(existingUser, {
        identityValue: fullPhone,
        authProvider: 'phone',
        password: password ? String(password) : undefined,
        request,
      });

      return NextResponse.json(loginResult);
    }

    // Yeni kullanıcı — Firebase ile doğrulandı, kayıt bekleniyor
    await logAuthEvent({ eventType: 'otp_verified', authMethod: 'phone', identityHint: fullPhone, request, details: { sms_provider: 'firebase', step: 'new_user' } });
    return NextResponse.json({ isNewUser: true, authProvider: 'phone', verified: true });
  } catch (error) {
    console.error('Verify Firebase error:', error);
    return NextResponse.json({ error: 'Doğrulama sırasında bir hata oluştu' }, { status: 500 });
  }
}
