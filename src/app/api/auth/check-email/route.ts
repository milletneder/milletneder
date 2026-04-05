import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashIdentity } from '@/lib/auth/registration';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Geçersiz e-posta' }, { status: 400 });
    }

    const trimmed = String(email).trim().toLowerCase();
    const identityHash = hashIdentity(trimmed);

    const [existingUser] = await db
      .select({ id: users.id, password_hash: users.password_hash })
      .from(users)
      .where(eq(users.identity_hash, identityHash))
      .limit(1);

    if (existingUser) {
      return NextResponse.json({
        exists: true,
        hasPassword: !!existingUser.password_hash,
      });
    }

    return NextResponse.json({ exists: false, hasPassword: false });
  } catch (error) {
    console.error('Check email error:', error);
    return NextResponse.json(
      { error: 'Kontrol sırasında hata oluştu' },
      { status: 500 }
    );
  }
}
