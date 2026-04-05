import { NextRequest, NextResponse } from 'next/server';
import { sql, eq, ilike, or, asc, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
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

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const flagged = searchParams.get('flagged');
    const dummy = searchParams.get('dummy');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(users.city, `%${search}%`),
          ilike(users.referral_code, `%${search}%`)
        )
      );
    }

    if (city) {
      conditions.push(eq(users.city, city));
    }

    if (flagged === 'true') {
      conditions.push(eq(users.is_flagged, true));
    } else if (flagged === 'false') {
      conditions.push(eq(users.is_flagged, false));
    }

    if (dummy === 'true') {
      conditions.push(eq(users.is_dummy, true));
    } else if (dummy === 'false') {
      conditions.push(eq(users.is_dummy, false));
    }

    const whereClause = conditions.length > 0
      ? sql`${sql.join(conditions.map(c => sql`(${c})`), sql` AND `)}`
      : undefined;

    // Get sort column
    const sortColumn = sort === 'city' ? users.city
      : users.created_at;

    const orderFn = order === 'asc' ? asc : desc;

    const query = db
      .select({
        id: users.id,
        identity_hash: users.identity_hash,
        city: users.city,
        district: users.district,
        auth_provider: users.auth_provider,
        is_flagged: users.is_flagged,
        is_dummy: users.is_dummy,
        referral_code: users.referral_code,
        created_at: users.created_at,
        last_login_at: users.last_login_at,
      })
      .from(users);

    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    let results;
    let totalResult;

    if (whereClause) {
      results = await query.where(whereClause).orderBy(orderFn(sortColumn)).limit(limit).offset(offset);
      totalResult = await countQuery.where(whereClause);
    } else {
      results = await query.orderBy(orderFn(sortColumn)).limit(limit).offset(offset);
      totalResult = await countQuery;
    }

    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      users: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json(
      { error: 'Kullanıcılar listelenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
