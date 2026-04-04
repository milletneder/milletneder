import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHash, createHmac } from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Telefon numarası gerekli' }, { status: 400 });
    }

    const rawPhone = phone.replace(/\s/g, '');
    if (rawPhone.length !== 10 || !rawPhone.startsWith('5')) {
      return NextResponse.json({ exists: false, hasPassword: false });
    }

    const IDENTITY_KEY = process.env.IDENTITY_KEY;
    const rawHash = createHash('sha256')
      .update((`+90${rawPhone}`).toLowerCase().trim())
      .digest('hex');
    const identityHash = IDENTITY_KEY
      ? createHmac('sha256', IDENTITY_KEY).update(Buffer.from(rawHash, 'hex')).digest('hex')
      : rawHash;

    const [user] = await db
      .select({
        id: users.id,
        is_active: users.is_active,
        password_hash: users.password_hash,
        city: users.city,
      })
      .from(users)
      .where(eq(users.identity_hash, identityHash))
      .limit(1);

    if (!user) {
      return NextResponse.json({ exists: false, hasPassword: false });
    }

    return NextResponse.json({
      exists: true,
      hasPassword: !!user.password_hash,
      isActive: user.is_active,
      isIncomplete: !user.city || user.city.trim() === '',
    });
  } catch (error) {
    console.error('Check phone error:', error);
    return NextResponse.json({ exists: false, hasPassword: false });
  }
}
