import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { demoTokens, parties } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';

export const dynamic = 'force-dynamic';

/**
 * GET: Tum demo tokenlarini listele.
 */
export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 403 });
  }

  const tokens = await db
    .select()
    .from(demoTokens)
    .orderBy(desc(demoTokens.created_at));

  const allParties = await db
    .select({
      id: parties.id,
      slug: parties.slug,
      name: parties.name,
      short_name: parties.short_name,
    })
    .from(parties)
    .where(eq(parties.is_active, true))
    .orderBy(parties.sort_order);

  return NextResponse.json({
    tokens: tokens.map((t) => ({
      id: t.id,
      token: t.token,
      party_id: t.party_id,
      party_name: t.party_name,
      expires_at: t.expires_at,
      is_active: t.is_active,
      access_count: t.access_count,
      last_accessed_at: t.last_accessed_at,
      created_at: t.created_at,
    })),
    parties: allParties,
  });
}

/**
 * POST: Yeni demo token olustur.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 403 });
  }

  let body: { party_id?: number; duration_days?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek' }, { status: 400 });
  }

  const { party_id, duration_days = 14 } = body;
  if (!party_id) {
    return NextResponse.json({ error: 'party_id gerekli' }, { status: 400 });
  }

  // Get party info
  const [party] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, party_id))
    .limit(1);

  if (!party) {
    return NextResponse.json({ error: 'Parti bulunamadi' }, { status: 404 });
  }

  // Generate token
  const token = crypto.randomBytes(32).toString('hex').slice(0, 32);

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Math.min(duration_days, 90));

  const [newToken] = await db
    .insert(demoTokens)
    .values({
      token,
      created_by: admin.id,
      party_id: party.id,
      party_name: party.name,
      expires_at: expiresAt,
      is_active: true,
      access_count: 0,
    })
    .returning();

  return NextResponse.json({ token: newToken }, { status: 201 });
}

/**
 * PATCH: Demo token guncelle (deaktif et).
 */
export async function PATCH(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 403 });
  }

  let body: { id?: number; is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek' }, { status: 400 });
  }

  const { id, is_active } = body;
  if (!id) {
    return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
  }

  await db
    .update(demoTokens)
    .set({ is_active: is_active ?? false })
    .where(eq(demoTokens.id, id));

  return NextResponse.json({ success: true });
}
