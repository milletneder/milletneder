import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const eventType = searchParams.get('event_type') || null;
    const offset = (page - 1) * limit;

    // Filtre kosullari
    const eventTypeCondition = eventType ? sql`AND event_type = ${eventType}` : sql``;

    // Toplam sayi
    const countRes = await db.execute(sql`
      SELECT count(*)::int as total FROM auth_logs WHERE 1=1 ${eventTypeCondition}
    `);
    const total = (countRes.rows[0] as { total: number })?.total ?? 0;

    // Loglari getir
    const logsRes = await db.execute(sql`
      SELECT id, event_type, auth_method, identity_hint, user_id, ip_address,
             substring(user_agent from 1 for 100) as user_agent,
             error_code, error_message, details,
             to_char(created_at AT TIME ZONE 'Europe/Berlin' AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
      FROM auth_logs
      WHERE 1=1 ${eventTypeCondition}
      ORDER BY id DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Event type dagilimi (ozet)
    const summary = await db.execute(sql`
      SELECT event_type, count(*)::int as count
      FROM auth_logs
      GROUP BY event_type
      ORDER BY count DESC
    `);

    return NextResponse.json({
      logs: logsRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: summary.rows,
    });
  } catch (error) {
    console.error('Auth logs error:', error);
    return NextResponse.json({ error: 'Auth loglari alinirken hata olustu' }, { status: 500 });
  }
}
