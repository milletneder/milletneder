import { NextRequest, NextResponse } from 'next/server';
import { getCode, deleteCode, markEmailAsVerified } from '@/lib/auth/verification-codes';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'E-posta ve kod gerekli' }, { status: 400 });
    }

    const stored = getCode(email);

    if (!stored) {
      return NextResponse.json({ error: 'Doğrulama kodu bulunamadı. Yeni kod gönderin.' }, { status: 400 });
    }

    // Check expiry
    if (Date.now() > stored.expiresAt) {
      deleteCode(email);
      return NextResponse.json({ error: 'Kodun süresi dolmuş. Yeni kod gönderin.' }, { status: 400 });
    }

    // Check attempts (max 5)
    if (stored.attempts >= 5) {
      deleteCode(email);
      return NextResponse.json({ error: 'Çok fazla hatalı deneme. Yeni kod gönderin.' }, { status: 429 });
    }

    // Verify code
    if (stored.code !== String(code).trim()) {
      stored.attempts++;
      return NextResponse.json({ error: 'Kod hatalı. Tekrar deneyin.' }, { status: 400 });
    }

    // Code is correct — mark email as verified in memory
    deleteCode(email);
    markEmailAsVerified(email);

    return NextResponse.json({ success: true, verified: true });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json({ error: 'Doğrulama sırasında bir hata oluştu' }, { status: 500 });
  }
}
