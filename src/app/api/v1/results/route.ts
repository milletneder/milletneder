import { NextRequest, NextResponse } from 'next/server';
import { sql, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rounds } from '@/lib/db/schema';
import { requireFeature } from '@/lib/billing/gate';
import { FEATURES } from '@/lib/billing/features';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const gate = await requireFeature(request, FEATURES.API_ACCESS);
    if (!gate) {
      return NextResponse.json(
        { error: 'Bu ozellik icin yetkiniz yok. API erisimi Arastirmaci planini gerektirir.' },
        { status: 403 }
      );
    }

    const roundIdParam = request.nextUrl.searchParams.get('round_id');

    // Determine round
    let roundId: number;
    let roundInfo;

    if (roundIdParam) {
      roundId = parseInt(roundIdParam);
      if (isNaN(roundId)) {
        return NextResponse.json({ error: 'Gecersiz round_id' }, { status: 400 });
      }

      const [round] = await db
        .select()
        .from(rounds)
        .where(eq(rounds.id, roundId))
        .limit(1);

      if (!round) {
        return NextResponse.json({ error: 'Tur bulunamadi' }, { status: 404 });
      }
      roundInfo = round;
    } else {
      const [activeRound] = await db
        .select()
        .from(rounds)
        .where(eq(rounds.is_active, true))
        .limit(1);

      if (!activeRound) {
        return NextResponse.json({ error: 'Aktif tur bulunamadi' }, { status: 404 });
      }
      roundId = activeRound.id;
      roundInfo = activeRound;
    }

    // Query anonymous vote counts grouped by party
    const result = await db.execute(sql`
      SELECT party, SUM(vote_count)::int as vote_count
      FROM anonymous_vote_counts
      WHERE round_id = ${roundId} AND is_valid = true AND vote_count > 0
      GROUP BY party
      ORDER BY vote_count DESC
    `);

    const rows = result.rows as { party: string; vote_count: number }[];
    const totalVotes = rows.reduce((sum, r) => sum + r.vote_count, 0);

    const results = rows.map((r) => ({
      party: r.party,
      votes: r.vote_count,
      percentage: totalVotes > 0 ? parseFloat(((r.vote_count / totalVotes) * 100).toFixed(2)) : 0,
    }));

    return NextResponse.json({
      round: {
        id: roundInfo.id,
        start_date: roundInfo.start_date,
        end_date: roundInfo.end_date,
        is_active: roundInfo.is_active,
      },
      total_votes: totalVotes,
      results,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API v1 results error:', error);
    return NextResponse.json(
      { error: 'Sonuclar alinirken hata olustu' },
      { status: 500 }
    );
  }
}
