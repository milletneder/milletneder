import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, sql, and, gte, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscriptions, subscriptionEvents, users } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { PLAN_PRICES, type PlanTier } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const tierFilter = searchParams.get('tier');
    const statusFilter = searchParams.get('status');

    // --- Stats ---

    // Active count
    const [activeRow] = await db
      .select({ value: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));
    const activeCount = activeRow?.value ?? 0;

    // Tier distribution (for chart + revenue estimate)
    const tierDistribution = await db
      .select({
        tier: subscriptions.plan_tier,
        count: count(),
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'))
      .groupBy(subscriptions.plan_tier);

    // Total revenue estimate: sum of active subscriptions x plan monthly price
    let totalRevenue = 0;
    for (const row of tierDistribution) {
      const tier = row.tier as PlanTier;
      const price = PLAN_PRICES[tier]?.monthly ?? 0;
      totalRevenue += price * row.count;
    }

    // New this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [newRow] = await db
      .select({ value: count() })
      .from(subscriptions)
      .where(gte(subscriptions.created_at, monthStart));
    const newThisMonth = newRow?.value ?? 0;

    // Cancelled this month
    const [cancelledRow] = await db
      .select({ value: count() })
      .from(subscriptions)
      .where(gte(subscriptions.cancelled_at, monthStart));
    const cancelledThisMonth = cancelledRow?.value ?? 0;

    // --- Subscribers (paginated, with filters) ---

    const conditions = [];
    if (tierFilter) {
      conditions.push(eq(subscriptions.plan_tier, tierFilter));
    }
    if (statusFilter) {
      conditions.push(eq(subscriptions.status, statusFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ value: count() })
      .from(subscriptions)
      .where(whereClause);
    const total = totalRow?.value ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const subscriberRows = await db
      .select({
        id: subscriptions.id,
        user_id: subscriptions.user_id,
        plan_tier: subscriptions.plan_tier,
        status: subscriptions.status,
        billing_interval: subscriptions.billing_interval,
        renews_at: subscriptions.renews_at,
        created_at: subscriptions.created_at,
        user_identity_hash: users.identity_hash,
        user_city: users.city,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.user_id, users.id))
      .where(whereClause)
      .orderBy(desc(subscriptions.created_at))
      .limit(limit)
      .offset(offset);

    // --- Recent Events (last 20) ---

    const recentEvents = await db
      .select({
        id: subscriptionEvents.id,
        event_type: subscriptionEvents.event_type,
        user_id: subscriptionEvents.user_id,
        created_at: subscriptionEvents.created_at,
      })
      .from(subscriptionEvents)
      .orderBy(desc(subscriptionEvents.created_at))
      .limit(20);

    return NextResponse.json({
      stats: {
        activeCount,
        totalRevenue,
        newThisMonth,
        cancelledThisMonth,
        tierDistribution: tierDistribution.map((r) => ({
          tier: r.tier,
          count: r.count,
        })),
      },
      subscribers: {
        data: subscriberRows,
        pagination: { page, limit, total, totalPages },
      },
      recentEvents,
    });
  } catch (error) {
    console.error('Admin subscriptions API error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatasi' },
      { status: 500 }
    );
  }
}
