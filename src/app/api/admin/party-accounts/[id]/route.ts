/**
 * Admin: Tek parti hesap islemleri
 *
 * GET    /api/admin/party-accounts/[id]  → Tek hesap detayi
 * PATCH  /api/admin/party-accounts/[id]  → action: activate | deactivate | reset_password
 * DELETE /api/admin/party-accounts/[id]  → Hard delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { partyAccounts, parties } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { hashPassword } from '@/lib/auth/password';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Gecersiz id' }, { status: 400 });
  }

  const [account] = await db
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
    })
    .from(partyAccounts)
    .leftJoin(parties, eq(partyAccounts.party_id, parties.id))
    .where(eq(partyAccounts.id, id))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: 'Hesap bulunamadi' }, { status: 404 });
  }

  return NextResponse.json({ account });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Gecersiz id' }, { status: 400 });
  }

  let body: { action?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek' }, { status: 400 });
  }

  const { action } = body;

  const [existing] = await db
    .select()
    .from(partyAccounts)
    .where(eq(partyAccounts.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Hesap bulunamadi' }, { status: 404 });
  }

  switch (action) {
    case 'activate': {
      await db
        .update(partyAccounts)
        .set({ is_active: true, updated_at: new Date() })
        .where(eq(partyAccounts.id, id));
      await logAdminAction({
        adminId: admin.id,
        action: 'activate_party_account',
        targetType: 'party_account',
        targetId: id,
      });
      return NextResponse.json({ success: true });
    }

    case 'deactivate': {
      await db
        .update(partyAccounts)
        .set({ is_active: false, updated_at: new Date() })
        .where(eq(partyAccounts.id, id));
      await logAdminAction({
        adminId: admin.id,
        action: 'deactivate_party_account',
        targetType: 'party_account',
        targetId: id,
      });
      return NextResponse.json({ success: true });
    }

    case 'reset_password': {
      if (!body.password || body.password.length < 8) {
        return NextResponse.json({ error: 'Sifre en az 8 karakter olmali' }, { status: 400 });
      }
      const password_hash = await hashPassword(body.password);
      await db
        .update(partyAccounts)
        .set({ password_hash, updated_at: new Date() })
        .where(eq(partyAccounts.id, id));
      await logAdminAction({
        adminId: admin.id,
        action: 'reset_party_account_password',
        targetType: 'party_account',
        targetId: id,
      });
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: 'Gecersiz action' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Gecersiz id' }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(partyAccounts)
    .where(eq(partyAccounts.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Hesap bulunamadi' }, { status: 404 });
  }

  await db.delete(partyAccounts).where(eq(partyAccounts.id, id));

  await logAdminAction({
    adminId: admin.id,
    action: 'delete_party_account',
    targetType: 'party_account',
    targetId: id,
    details: { email: existing.email },
  });

  return NextResponse.json({ success: true });
}
