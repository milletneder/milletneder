import { NextRequest, NextResponse } from 'next/server';
import { sendVerification } from '@/lib/sms/twilio';
import { logAuthEvent } from '@/lib/auth/auth-logger';

// Email-based rate limiting (1 request per 60 seconds)
const emailSendTimestamps = new Map<string, number>();

// IP-based rate limiting for OTP sends
const ipSendCounts = new Map<string, { count: number; windowStart: number }>();

function isEmailRateLimited(email: string): boolean {
  const lastSent = emailSendTimestamps.get(email.toLowerCase());
  if (!lastSent) return false;
  return Date.now() - lastSent < 60 * 1000;
}

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
    for (const [email, ts] of emailSendTimestamps) {
      if (now - ts > 60 * 1000) emailSendTimestamps.delete(email);
    }
  }, 10 * 60 * 1000);
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    const trimmed = String(email || '').trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip') ?? 'unknown';

    // Rate limits
    if (isEmailRateLimited(trimmed)) {
      return NextResponse.json({ error: 'Çok sık deneme. 60 saniye bekleyin.', retryAfter: 60 }, { status: 429 });
    }

    if (isIpRateLimited(ip)) {
      await logAuthEvent({ eventType: 'register_blocked', authMethod: 'email', identityHint: trimmed, request, errorCode: 'otp_ip_rate_limit' });
      return NextResponse.json({ error: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.' }, { status: 429 });
    }

    // Send verification via Twilio Verify API (email channel)
    await sendVerification(trimmed, 'email');

    // Track send timestamp for rate limiting
    emailSendTimestamps.set(trimmed, Date.now());

    await logAuthEvent({ eventType: 'register_incomplete', authMethod: 'email', identityHint: trimmed, request, details: { step: 'email_otp_sent' } });

    return NextResponse.json({ success: true, expiresIn: 300 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Send email OTP error:', errMsg);

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

    // Twilio channel disabled
    if (errMsg.includes('channel disabled') || errMsg.includes('Delivery channel')) {
      return NextResponse.json({ error: 'E-posta doğrulama kanalı aktif değil. Twilio Console > Verify > Services > Email Integration bölümünden e-posta kanalını etkinleştirin.' }, { status: 500 });
    }

    return NextResponse.json({ error: 'E-posta doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyin.' }, { status: 500 });
  }
}
