import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscriptions, customReportRequests } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { hasFeature, FEATURES } from '@/lib/billing/features';
import type { PlanTier } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

/**
 * GET: Kullanicinin gecmis rapor taleplerini listele.
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  const tier = (user.subscription_tier || 'free') as PlanTier;
  if (!hasFeature(tier, FEATURES.CUSTOM_REPORTS)) {
    return NextResponse.json({ error: 'Bu ozellik icin yetkiniz yok' }, { status: 403 });
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
    .where(eq(customReportRequests.user_id, user.id))
    .orderBy(desc(customReportRequests.created_at));

  return NextResponse.json({ requests });
}

/**
 * POST: Yeni rapor talebi olustur. Kullanici basina en fazla 2 bekleyen talep.
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  const tier = (user.subscription_tier || 'free') as PlanTier;
  if (!hasFeature(tier, FEATURES.CUSTOM_REPORTS)) {
    return NextResponse.json({ error: 'Bu ozellik icin yetkiniz yok' }, { status: 403 });
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
        eq(customReportRequests.user_id, user.id),
        eq(customReportRequests.status, 'pending'),
      )
    );

  if ((pendingRow?.value || 0) >= 2) {
    return NextResponse.json(
      { error: 'En fazla 2 bekleyen talebiniz olabilir' },
      { status: 429 },
    );
  }

  // Get party_id from subscription
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_id, user.id))
    .limit(1);

  const [newRequest] = await db
    .insert(customReportRequests)
    .values({
      user_id: user.id,
      party_id: sub?.party_id || null,
      title: title.trim(),
      description: description?.trim() || null,
      status: 'pending',
    })
    .returning();

  return NextResponse.json({ request: newRequest }, { status: 201 });
}
