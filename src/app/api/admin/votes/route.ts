import { NextRequest, NextResponse } from 'next/server';
import { sql, eq, and, asc, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { votes, users, parties as partiesTable } from '@/lib/db/schema';
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
    const roundId = searchParams.get('roundId');
    const party = searchParams.get('party');
    const city = searchParams.get('city');
    const isValid = searchParams.get('isValid');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (roundId) {
      conditions.push(eq(votes.round_id, parseInt(roundId, 10)));
    }
    if (party) {
      conditions.push(eq(votes.party, party));
    }
    if (city) {
      conditions.push(eq(votes.city, city));
    }
    if (isValid === 'true') {
      conditions.push(eq(votes.is_valid, true));
    } else if (isValid === 'false') {
      conditions.push(eq(votes.is_valid, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db
      .select({
        id: votes.id,
        user_id: votes.user_id,
        round_id: votes.round_id,
        party: votes.party,
        city: votes.city,
        is_valid: votes.is_valid,
        change_count: votes.change_count,
        created_at: votes.created_at,
        updated_at: votes.updated_at,
        user_identity_hash: users.identity_hash,
        user_city: users.city,
      })
      .from(votes)
      .leftJoin(users, eq(votes.user_id, users.id));

    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(votes);

    let results;
    let totalResult;

    if (whereClause) {
      results = await query.where(whereClause).orderBy(desc(votes.created_at)).limit(limit).offset(offset);
      totalResult = await countQuery.where(whereClause);
    } else {
      results = await query.orderBy(desc(votes.created_at)).limit(limit).offset(offset);
      totalResult = await countQuery;
    }

    const total = totalResult[0]?.count ?? 0;

    // Parti slug → kısa ad
    const dbParties = await db.select().from(partiesTable);
    const slugToShort: Record<string, string> = {};
    for (const p of dbParties) slugToShort[p.slug] = p.short_name;

    const mappedResults = results.map((r) => ({
      ...r,
      party: r.party ? (slugToShort[r.party] || r.party) : '🔒 Korumalı',
    }));

    return NextResponse.json({
      votes: mappedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Votes list error:', error);
    return NextResponse.json(
      { error: 'Oylar listelenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
