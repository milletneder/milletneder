import { NextRequest, NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cityVoterCounts, districtVoterCounts, rounds } from "@/lib/db/schema";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope");
    const cityFilter = request.nextUrl.searchParams.get("city");

    // Aktif turu bul
    const [activeRound] = await db.select().from(rounds).where(eq(rounds.is_active, true)).limit(1);
    const activeRoundId = activeRound?.id;
    const roundCondition = activeRoundId ? sql`AND round_id = ${activeRoundId}` : sql``;

    // Ilce modu: belirli bir ilin ilceleri veya tum ilceler
    if (scope === "district" || cityFilter) {
      const voterCountRows = await db.select().from(districtVoterCounts);
      const districtVoterMap: Record<string, number> = {};
      for (const row of voterCountRows) {
        const key = `${row.city}|${row.district}`;
        districtVoterMap[key] = row.voter_count;
      }

      const cityCondition = cityFilter ? sql`AND city = ${cityFilter}` : sql``;
      const latestVotesResult = await db.execute(sql`
        SELECT city, district, SUM(vote_count)::int as vote_count
        FROM anonymous_vote_counts
        WHERE is_valid = true AND party != 'karasizim' AND vote_count > 0 ${cityCondition} ${roundCondition}
        GROUP BY city, district
      `);

      const districtVotes = latestVotesResult.rows as { city: string; district: string; vote_count: number }[];

      const leaderboard = districtVotes
        .filter(row => row.district)
        .map((row) => {
          const key = `${row.city}|${row.district}`;
          const voterCount = districtVoterMap[key] || 0;
          const representationPct = voterCount > 0
            ? (row.vote_count / voterCount) * 100
            : 0;
          return {
            city: row.city,
            district: row.district,
            label: cityFilter ? row.district : `${row.district} (${row.city})`,
            voteCount: row.vote_count,
            voterCount,
            representationPct,
          };
        })
        .sort((a, b) => b.representationPct - a.representationPct);

      return NextResponse.json({ leaderboard, scope: cityFilter ? 'city-districts' : 'district' });
    }

    // Il modu (varsayilan)
    const voterCountRows = await db.select().from(cityVoterCounts);
    const cityVoterMap: Record<string, number> = {};
    for (const row of voterCountRows) {
      cityVoterMap[row.city] = row.voter_count;
    }

    const latestVotesResult2 = await db.execute(sql`
      SELECT city, SUM(vote_count)::int as vote_count
      FROM anonymous_vote_counts
      WHERE is_valid = true AND party != 'karasizim' AND vote_count > 0 ${roundCondition}
      GROUP BY city
    `);

    const cityVotes = latestVotesResult2.rows as { city: string; vote_count: number }[];

    const leaderboard = cityVotes
      .map((row) => {
        const voterCount = cityVoterMap[row.city] || 0;
        const representationPct = voterCount > 0
          ? (row.vote_count / voterCount) * 100
          : 0;
        return {
          city: row.city,
          voteCount: row.vote_count,
          voterCount,
          representationPct,
        };
      })
      .sort((a, b) => b.representationPct - a.representationPct);

    return NextResponse.json({ leaderboard, scope: 'city' });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Siralama verileri alinirken bir hata olustu" },
      { status: 500 }
    );
  }
}
