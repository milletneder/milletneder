import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Geçersiz e-posta' }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    try {
      await adminAuth.getUserByEmail(email);
      // Kullanıcı var
      return NextResponse.json({ exists: true });
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      if (fbErr.code === 'auth/user-not-found') {
        return NextResponse.json({ exists: false });
      }
      throw err;
    }
  } catch (error) {
    console.error('Check email error:', error);
    return NextResponse.json(
      { error: 'Kontrol sırasında hata oluştu' },
      { status: 500 }
    );
  }
}
