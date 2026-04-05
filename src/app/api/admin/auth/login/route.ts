import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { comparePassword } from '@/lib/auth/password';
import { signAdminToken } from '@/lib/auth/admin-jwt';
import { whitelistAdminIP } from '@/lib/auth/admin-ip-whitelist';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-posta ve şifre gereklidir' },
        { status: 400 }
      );
    }

    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email.toLowerCase()))
      .limit(1);

    if (!admin) {
      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı' },
        { status: 403 }
      );
    }

    if (!admin.is_active) {
      return NextResponse.json(
        { error: 'Hesabınız devre dışı bırakılmıştır' },
        { status: 403 }
      );
    }

    const isValid = await comparePassword(password, admin.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı' },
        { status: 403 }
      );
    }

    // Update last_login_at
    await db
      .update(admins)
      .set({ last_login_at: new Date(), updated_at: new Date() })
      .where(eq(admins.id, admin.id));

    // Admin IP'sini kayıt kısıtından muaf tut (24 saat — test amaçlı)
    const adminIP =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';
    if (adminIP !== 'unknown') {
      whitelistAdminIP(adminIP);
    }

    const token = signAdminToken({ adminId: admin.id, email: admin.email });

    const { password_hash: _, ...adminData } = admin;

    const response = NextResponse.json({
      token,
      admin: { ...adminData, last_login_at: new Date() },
    });

    // Cookie olarak da set et (nginx Basic Auth ile çakışmaması için)
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 saat
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Giriş sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}
