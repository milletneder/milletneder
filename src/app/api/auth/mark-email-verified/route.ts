import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { isEmailCodeVerified, clearEmailVerified } from '@/lib/auth/verification-codes';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { firebaseIdToken } = await request.json();

    if (!firebaseIdToken) {
      return NextResponse.json({ error: 'Firebase token gerekli' }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(firebaseIdToken);
    } catch {
      return NextResponse.json({ error: 'Token doğrulanamadı' }, { status: 401 });
    }

    const email = decodedToken.email;
    if (!email) {
      return NextResponse.json({ error: 'Token içinde e-posta bulunamadı' }, { status: 400 });
    }

    // Check if this email was verified via our code system
    if (!isEmailCodeVerified(email)) {
      return NextResponse.json({ error: 'E-posta doğrulama kodu onaylanmamış' }, { status: 400 });
    }

    // Mark email as verified in Firebase
    await adminAuth.updateUser(decodedToken.uid, { emailVerified: true });

    // Clear the in-memory verification flag
    clearEmailVerified(email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark email verified error:', error);
    return NextResponse.json({ error: 'E-posta doğrulama sırasında bir hata oluştu' }, { status: 500 });
  }
}
