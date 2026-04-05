import { NextRequest, NextResponse } from 'next/server';
import { generateOtpCode, storeOtp, isOtpRateLimited } from '@/lib/auth/phone-otp-store';
import { sendOTP } from '@/lib/sms/twilio';
import { logAuthEvent } from '@/lib/auth/auth-logger';

// IP-based rate limiting for OTP sends
const ipSendCounts = new Map<string, { count: number; windowStart: number }>();

function isIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipSendCounts.get(ip);
  if (!entry || now - entry.windowStart > 15 * 60 * 1000) {
    ipSendCounts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > 10; // max 10 OTP sends per IP per 15 min
}

// Cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of ipSendCounts) {
      if (now - entry.windowStart > 15 * 60 * 1000) ipSendCounts.delete(ip);
    }
  }, 10 * 60 * 1000);
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    // Validate phone
    const raw = String(phone || '').replace(/\s/g, '');
    if (raw.length !== 10 || !raw.startsWith('5')) {
      return NextResponse.json({ error: 'Geçerli bir cep telefonu numarası girin (5XX ile başlamalı)' }, { status: 400 });
    }

    const fullPhone = `+90${raw}`;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip') ?? 'unknown';

    // Rate limits
    if (isOtpRateLimited(fullPhone)) {
      return NextResponse.json({ error: 'Çok sık deneme. 60 saniye bekleyin.', retryAfter: 60 }, { status: 429 });
    }

    if (isIpRateLimited(ip)) {
      await logAuthEvent({ eventType: 'register_blocked', authMethod: 'phone', identityHint: fullPhone, request, errorCode: 'otp_ip_rate_limit' });
      return NextResponse.json({ error: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.' }, { status: 429 });
    }

    // Generate and send OTP
    const code = generateOtpCode();
    storeOtp(fullPhone, code);

    await sendOTP(fullPhone, code);

    await logAuthEvent({ eventType: 'register_incomplete', authMethod: 'phone', identityHint: fullPhone, request, details: { step: 'otp_sent' } });

    return NextResponse.json({ success: true, expiresIn: 300 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Send OTP error:', errMsg);

    // Twilio-specific user-facing errors
    if (errMsg.includes('doğrulanmış numara') || errMsg.includes('Verified Caller')) {
      return NextResponse.json({ error: 'Twilio trial hesabı: Bu numara henüz doğrulanmamış. Twilio Console\'dan numaranızı doğrulayın.' }, { status: 400 });
    }
    if (errMsg.includes('uluslararası SMS') || errMsg.includes('Geo Permissions') || errMsg.includes('bu bölgeye')) {
      return NextResponse.json({ error: 'SMS servisi Türkiye\'ye gönderim için yapılandırılmamış. Admin panelden ayarları kontrol edin.' }, { status: 500 });
    }
    if (errMsg.includes('SID') || errMsg.includes('Token') || errMsg.includes('ayarlanmalı')) {
      return NextResponse.json({ error: 'SMS servisi henüz yapılandırılmamış. Admin panelden Twilio ayarlarını girin.' }, { status: 500 });
    }

    return NextResponse.json({ error: `SMS gönderilemedi: ${errMsg}` }, { status: 500 });
  }
}
