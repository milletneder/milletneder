import { NextRequest, NextResponse } from 'next/server';
import { sendVerification } from '@/lib/sms/twilio';
import { isRateLimited, storeCode, generateCode } from '@/lib/auth/verification-codes';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi gerekli' }, { status: 400 });
    }

    const trimmed = String(email).trim().toLowerCase();

    if (isRateLimited(trimmed)) {
      return NextResponse.json({ error: 'Lütfen 1 dakika bekleyin' }, { status: 429 });
    }

    // Track rate limit via verification-codes store
    const code = generateCode();
    storeCode(trimmed, code);

    // Send verification via Twilio Verify API (email channel)
    await sendVerification(trimmed, 'email');

    return NextResponse.json({ success: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Send verification code error:', errMsg);

    // Twilio-specific user-facing errors
    if (errMsg.includes('Verify Service SID')) {
      return NextResponse.json({ error: 'E-posta servisi henüz yapılandırılmamış. Admin panelden Twilio Verify Service SID girin.' }, { status: 500 });
    }
    if (errMsg.includes('SID') || errMsg.includes('Token') || errMsg.includes('ayarlanmalı')) {
      return NextResponse.json({ error: 'E-posta servisi henüz yapılandırılmamış. Admin panelden Twilio ayarlarını girin.' }, { status: 500 });
    }
    if (errMsg.includes('Geçersiz e-posta') || errMsg.includes('kullanılamıyor')) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    if (errMsg.includes('Çok fazla')) {
      return NextResponse.json({ error: errMsg }, { status: 429 });
    }

    return NextResponse.json({ error: 'Doğrulama kodu gönderilemedi' }, { status: 500 });
  }
}
