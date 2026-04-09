import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { customReportRequests } from '@/lib/db/schema';
import { getPartyContext, partyContextHasFeature } from '@/lib/auth/party-context';
import { FEATURES } from '@/lib/billing/features';

export const dynamic = 'force-dynamic';

/**
 * GET: Kullanicinin gecmis rapor taleplerini listele.
 * Demo modunda bos liste + demoMode flag dondurur.
 */
export async function GET(request: NextRequest) {
  const ctx = await getPartyContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  if (!partyContextHasFeature(ctx, FEATURES.CUSTOM_REPORTS)) {
    return NextResponse.json({ error: 'Bu ozellik icin yetkiniz yok' }, { status: 403 });
  }

  // Demo modunda gecmis talep listesi bos
  if (ctx.kind === 'demo') {
    return NextResponse.json({ requests: [], demoMode: true });
  }

  const requests = await db
    .select({
      id: customReportRequests.id,
      title: customReportRequests.title,
      description: customReportRequests.description,
      status: customReportRequests.status,
      admin_notes: customReportRequests.admin_notes,
      report_url: customReportRequests.report_url,
      created_at: customReportRequests.created_at,
    })
    .from(customReportRequests)
    .where(eq(customReportRequests.user_id, ctx.userId))
    .orderBy(desc(customReportRequests.created_at));

  return NextResponse.json({ requests });
}

/**
 * POST: Yeni rapor talebi olustur. Kullanici basina en fazla 2 bekleyen talep.
 * Demo modunda rapor talebi olusturulamaz.
 */
export async function POST(request: NextRequest) {
  const ctx = await getPartyContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  if (!partyContextHasFeature(ctx, FEATURES.CUSTOM_REPORTS)) {
    return NextResponse.json({ error: 'Bu ozellik icin yetkiniz yok' }, { status: 403 });
  }

  // Demo modunda rapor talebi olusturulamaz
  if (ctx.kind === 'demo') {
    return NextResponse.json(
      { error: 'Demo modunda rapor talebi olusturulamaz. Tam hesap icin iletisim@milletneder.com' },
      { status: 403 },
    );
  }

  let body: { title?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek' }, { status: 400 });
  }

  const { title, description } = body;
  if (!title || title.trim().length === 0) {
    return NextResponse.json({ error: 'Baslik zorunludur' }, { status: 400 });
  }

  if (title.trim().length > 255) {
    return NextResponse.json({ error: 'Baslik en fazla 255 karakter olabilir' }, { status: 400 });
  }

  // Check pending limit
  const [pendingRow] = await db
    .select({ value: count() })
    .from(customReportRequests)
    .where(
      and(
        eq(customReportRequests.user_id, ctx.userId),
        eq(customReportRequests.status, 'pending'),
      )
    );

  if ((pendingRow?.value || 0) >= 2) {
    return NextResponse.json(
      { error: 'En fazla 2 bekleyen talebiniz olabilir' },
      { status: 429 },
    );
  }

  const [newRequest] = await db
    .insert(customReportRequests)
    .values({
      user_id: ctx.userId,
      party_id: ctx.partyId,
      title: title.trim(),
      description: description?.trim() || null,
      status: 'pending',
    })
    .returning();

  return NextResponse.json({ request: newRequest }, { status: 201 });
}
