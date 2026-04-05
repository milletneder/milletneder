import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isPhoneOtpVerified, clearPhoneVerified } from '@/lib/auth/phone-otp-store';
import { hashIdentity, registerNewUser, completeIncompleteRegistration, type RegistrationInput } from '@/lib/auth/registration';
import { logAuthEvent } from '@/lib/auth/auth-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, city, district, party, password, referralCode, fingerprint, recoveryEmail } = body;

    // Validate phone
    const raw = String(phone || '').replace(/\s/g, '');
    if (raw.length !== 10 || !raw.startsWith('5')) {
      return NextResponse.json({ error: 'Geçersiz telefon numarası' }, { status: 400 });
    }

    const fullPhone = `+90${raw}`;

    // Check phone is OTP-verified
    if (!isPhoneOtpVerified(fullPhone)) {
      return NextResponse.json({ error: 'Telefon numarası doğrulanmamış. Önce OTP ile doğrulayın.' }, { status: 401 });
    }

    // Validate required fields
    if (!city) return NextResponse.json({ error: 'İl seçimi gerekli' }, { status: 400 });
    if (!district) return NextResponse.json({ error: 'İlçe seçimi gerekli' }, { status: 400 });
    if (!party) return NextResponse.json({ error: 'Parti seçimi gerekli' }, { status: 400 });

    const identityHash = hashIdentity(fullPhone);

    const input: RegistrationInput = {
      identityHash,
      identityValue: fullPhone,
      authProvider: 'phone',
      city: String(city),
      district: String(district),
      party: String(party),
      password: password ? String(password) : undefined,
      referralCode: referralCode ? String(referralCode) : undefined,
      fingerprint: fingerprint ? String(fingerprint) : undefined,
      recoveryEmail: recoveryEmail ? String(recoveryEmail) : undefined,
      request,
    };

    // Check for existing incomplete user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.identity_hash, identityHash))
      .limit(1);

    let result;
    if (existingUser) {
      const isIncomplete = !existingUser.city || existingUser.city.trim() === '';
      if (isIncomplete) {
        // Activate if needed
        if (!existingUser.is_active) {
          await db.update(users).set({ is_active: true, updated_at: new Date() }).where(eq(users.id, existingUser.id));
          existingUser.is_active = true;
        }
        result = await completeIncompleteRegistration(existingUser, input);
      } else {
        // User already exists and complete — shouldn't reach here
        return NextResponse.json({ error: 'Bu numara ile zaten kayıtlı bir hesap var.' }, { status: 409 });
      }
    } else {
      result = await registerNewUser(input);
    }

    console.log(`[REGISTER-PHONE] Registration result:`, JSON.stringify(result, null, 2).slice(0, 500));

    // Check for error result
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Clear verified status — registration complete
    clearPhoneVerified(fullPhone);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Register phone error:', error);
    await logAuthEvent({ eventType: 'register_fail', authMethod: 'phone', request, errorCode: 'server_error', errorMessage: String(error) });
    return NextResponse.json({ error: 'Kayıt sırasında bir hata oluştu' }, { status: 500 });
  }
}
