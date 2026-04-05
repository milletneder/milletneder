import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isRateLimited } from '@/lib/auth/verification-codes';
import { sendVerification } from '@/lib/sms/twilio';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin' }, { status: 400 });
    }

    const trimmed = String(email).toLowerCase().trim();

    const emailHash = createHash('sha256')
      .update(trimmed)
      .digest('hex');

    // Find user by recovery_email_hash
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.recovery_email_hash, emailHash))
      .limit(1);

    // Always return success (don't reveal if email exists)
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Rate limit
    if (isRateLimited(trimmed)) {
      return NextResponse.json({ error: 'Lütfen 1 dakika bekleyin' }, { status: 429 });
    }

    // Send verification via Twilio Verify API (email channel)
    await sendVerification(trimmed, 'email');

    return NextResponse.json({ success: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Forgot password error:', errMsg);

    if (errMsg.includes('Verify Service SID') || errMsg.includes('SID') || errMsg.includes('ayarlanmalı')) {
      return NextResponse.json({ error: 'E-posta servisi henüz yapılandırılmamış.' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Şifre sıfırlama kodu gönderilemedi' }, { status: 500 });
  }
}
