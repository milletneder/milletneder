import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const { password_hash: _, ...adminData } = admin;
    return NextResponse.json({ admin: adminData });
  } catch (error) {
    console.error('Admin me error:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
