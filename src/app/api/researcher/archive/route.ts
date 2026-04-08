import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rounds } from '@/lib/db/schema';
import { requireFeature } from '@/lib/billing/gate';
import { FEATURES } from '@/lib/billing/features';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const gate = await requireFeature(request, FEATURES.FULL_ARCHIVE);
    if (!gate) {
      return NextResponse.json(
        { error: 'Bu ozellik icin yetkiniz yok' },
        { status: 403 }
      );
    }

    // Fetch all rounds
    const allRounds = await db
      .select()
      .from(rounds)
      .orderBy(sql`id DESC`);

    // For each round, get party distribution from anonymous_vote_counts
    const roundSummaries = await Promise.all(
      allRounds.map(async (round) => {
        const result = await db.execute(sql`
          SELECT party, SUM(vote_count)::int as vote_count
          FROM anonymous_vote_counts
          WHERE round_id = ${round.id} AND is_valid = true AND vote_count > 0
          GROUP BY party
          ORDER BY vote_count DESC
        `);

        const rows = result.rows as { party: string; vote_count: number }[];
        const totalVotes = rows.reduce((sum, r) => sum + r.vote_count, 0);

        const parties = rows.map((r) => ({
          party: r.party,
          votes: r.vote_count,
          percentage: totalVotes > 0 ? (r.vote_count / totalVotes) * 100 : 0,
        }));

        return {
          id: round.id,
          start_date: round.start_date,
          end_date: round.end_date,
          is_active: round.is_active,
          is_published: round.is_published,
          total_votes: totalVotes,
          parties,
        };
      })
    );

    return NextResponse.json({
      rounds: roundSummaries,
      total_rounds: roundSummaries.length,
    });
  } catch (error) {
    console.error('Archive error:', error);
    return NextResponse.json(
      { error: 'Arsiv yuklenirken hata olustu' },
      { status: 500 }
    );
  }
}
