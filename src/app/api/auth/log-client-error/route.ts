import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authLogs } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

// In-memory rate limiter — IP başına dakikada max 10 log
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    // Rate limit kontrolü
    const now = Date.now();
    const entry = rateLimiter.get(ip);
    if (entry && now < entry.resetAt) {
      if (entry.count >= 10) {
        return NextResponse.json({ ok: true }); // Sessizce kabul et ama kaydetme
      }
      entry.count++;
    } else {
      rateLimiter.set(ip, { count: 1, resetAt: now + 60_000 });
    }

    const body = await request.json();
    const { errorCode, errorMessage, step, phone, context } = body;

    if (!errorCode || typeof errorCode !== 'string') {
      return NextResponse.json({ ok: true });
    }

    // Telefon numarasını maskele (sadece son 4 hane)
    let identityHint: string | null = null;
    if (phone && typeof phone === 'string') {
      const digits = phone.replace(/\D/g, '');
      identityHint = digits.length >= 4 ? `***${digits.slice(-4)}` : null;
    }

    const userAgent = request.headers.get('user-agent') ?? null;

    await db.insert(authLogs).values({
      event_type: 'client_error',
      auth_method: 'phone',
      identity_hint: identityHint,
      user_id: null,
      ip_address: ip,
      user_agent: userAgent,
      error_code: String(errorCode).substring(0, 100),
      error_message: errorMessage ? String(errorMessage).substring(0, 500) : null,
      details: JSON.stringify({
        step: step || 'unknown',
        context: context || null,
        timestamp: new Date().toISOString(),
      }),
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Client error logging hiçbir zaman hata döndürmemeli
    return NextResponse.json({ ok: true });
  }
}
