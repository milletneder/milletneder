/**
 * Admin: Parti Hesap Yonetimi API
 *
 * GET  /api/admin/party-accounts       → Tum parti hesaplarini listele (parti bilgisiyle join)
 * POST /api/admin/party-accounts       → Yeni parti hesabi olustur (email + password + party_id)
 *
 * Sadece admin erisimi. Tum islemler audit log'a yazilir.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { partyAccounts, parties } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { hashPassword } from '@/lib/auth/password';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 403 });
  }

  const accounts = await db
    .select({
      id: partyAccounts.id,
      email: partyAccounts.email,
      is_active: partyAccounts.is_active,
      last_login_at: partyAccounts.last_login_at,
      created_at: partyAccounts.created_at,
      updated_at: partyAccounts.updated_at,
      party_id: partyAccounts.party_id,
      party_name: parties.name,
      party_short_name: parties.short_name,
      party_color: parties.color,
    })
    .from(partyAccounts)
    .leftJoin(parties, eq(partyAccounts.party_id, parties.id))
    .orderBy(desc(partyAccounts.created_at));

  // Parti listesi (dropdown icin)
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

  return NextResponse.json({ accounts, parties: allParties });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 403 });
  }

  let body: { email?: string; password?: string; party_id?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek' }, { status: 400 });
  }

  const { email, password, party_id } = body;
  if (!email || !password || !party_id) {
    return NextResponse.json({ error: 'email, password ve party_id gerekli' }, { status: 400 });
  }

  if (String(password).length < 8) {
    return NextResponse.json({ error: 'Sifre en az 8 karakter olmali' }, { status: 400 });
  }

  const cleanEmail = String(email).toLowerCase().trim();

  // Unique email check
  const [existing] = await db
    .select({ id: partyAccounts.id })
    .from(partyAccounts)
    .where(eq(partyAccounts.email, cleanEmail))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: 'Bu e-posta ile hesap zaten var' }, { status: 400 });
  }

  // Party existence check
  const [party] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, party_id))
    .limit(1);

  if (!party) {
    return NextResponse.json({ error: 'Parti bulunamadi' }, { status: 404 });
  }

  const password_hash = await hashPassword(password);

  const [newAccount] = await db
    .insert(partyAccounts)
    .values({
      email: cleanEmail,
      password_hash,
      party_id,
      is_active: true,
    })
    .returning();

  await logAdminAction({
    adminId: admin.id,
    action: 'create_party_account',
    targetType: 'party_account',
    targetId: newAccount.id,
    details: { email: cleanEmail, party_id, party_name: party.name },
  });

  return NextResponse.json(
    {
      account: {
        id: newAccount.id,
        email: newAccount.email,
        party_id: newAccount.party_id,
        is_active: newAccount.is_active,
        created_at: newAccount.created_at,
      },
    },
    { status: 201 },
  );
}
