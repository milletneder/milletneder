import { NextRequest, NextResponse } from 'next/server';
import { sql, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rounds, parties as partiesTable } from '@/lib/db/schema';
import { getPartyColor, getPartyName } from '@/lib/parties';
import { computeWeightedResults } from '@/lib/weighting/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Aktif turu bul
    const [activeRound] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.is_active, true))
      .limit(1);

    // DB'den parti isimlerini çek
    const dbParties = await db.select().from(partiesTable);
    const slugToShortName: Record<string, string> = {};
    const slugToColor: Record<string, string> = {};
    for (const p of dbParties) {
      slugToShortName[p.slug] = p.short_name;
      slugToColor[p.slug] = p.color;
    }

    // anonymous_vote_counts'tan parti ve şehir bazlı sayımlar (sadece aktif tur)
    const activeRoundId = activeRound?.id;
    const latestVotesQuery = activeRoundId
      ? sql`
        SELECT party, city, SUM(vote_count)::int as vote_count
        FROM anonymous_vote_counts
        WHERE is_valid = true AND vote_count > 0 AND round_id = ${activeRoundId}
        GROUP BY party, city
      `
      : sql`
        SELECT party, city, SUM(vote_count)::int as vote_count
        FROM anonymous_vote_counts
        WHERE is_valid = true AND vote_count > 0
        GROUP BY party, city
      `;

    const latestVotes = await db.execute(latestVotesQuery);
    const rows = latestVotes.rows as { party: string; city: string; vote_count: number }[];

    // Parti ve şehir bazlı sayımlar
    const partyCountMap: Record<string, number> = {};
    const cityCountMap: Record<string, number> = {};

    for (const row of rows) {
      if (row.party === 'karasizim') continue;
      partyCountMap[row.party] = (partyCountMap[row.party] || 0) + row.vote_count;
      cityCountMap[row.city] = (cityCountMap[row.city] || 0) + row.vote_count;
    }

    const totalVotes = Object.values(partyCountMap).reduce((s, c) => s + c, 0);

    const partyResults = Object.entries(partyCountMap)
      .map(([party, count]) => ({
        partyId: party,
        partyName: slugToShortName[party] || getPartyName(party),
        color: slugToColor[party] || getPartyColor(party),
        voteCount: count,
        percentage: totalVotes > 0 ? (count / totalVotes) * 100 : 0,
      }))
      .sort((a, b) => b.voteCount - a.voteCount);

    // Ağırlıklı sonuçlar (isteğe bağlı)
    const wantWeighted = request.nextUrl.searchParams.get('weighted') === 'true';
    let weighted = null;

    if (wantWeighted) {
      try {
        weighted = await computeWeightedResults(activeRound?.id);
      } catch (e) {
        console.error('Weighted computation failed:', e);
      }
    }

    return NextResponse.json({
      totalVotes,
      round: activeRound
        ? {
            id: activeRound.id,
            isActive: activeRound.is_active,
            startDate: activeRound.start_date,
            endDate: activeRound.end_date,
            resultsPublished: activeRound.is_published,
          }
        : null,
      partyResults,
      cityCounts: cityCountMap,
      weighted,
    });
  } catch (error) {
    console.error('Live count error:', error);
    return NextResponse.json({
      totalVotes: 0,
      round: null,
      partyResults: [],
      cityCounts: {},
    });
  }
}
