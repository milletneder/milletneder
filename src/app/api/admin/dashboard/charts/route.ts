import { NextRequest, NextResponse } from 'next/server';
import { sql, gte, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, authLogs } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';

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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [registrations, loginsData] = await Promise.all([
      db
        .select({
          date: sql<string>`date_trunc('day', ${users.created_at})::date::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(users)
        .where(gte(users.created_at, thirtyDaysAgo))
        .groupBy(sql`date_trunc('day', ${users.created_at})`)
        .orderBy(sql`date_trunc('day', ${users.created_at})`),
      db
        .select({
          date: sql<string>`date_trunc('day', ${authLogs.created_at})::date::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(authLogs)
        .where(sql`${authLogs.created_at} >= ${thirtyDaysAgo} AND ${authLogs.event_type} = 'login'`)
        .groupBy(sql`date_trunc('day', ${authLogs.created_at})`)
        .orderBy(sql`date_trunc('day', ${authLogs.created_at})`),
    ]);

    return NextResponse.json({ registrations, logins: loginsData });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    return NextResponse.json(
      { error: 'Grafik verileri alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
