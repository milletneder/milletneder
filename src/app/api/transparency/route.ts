import { NextRequest, NextResponse } from "next/server";
import { eq, sql, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, parties as partiesTable, rounds } from "@/lib/db/schema";
import { computeWeightedResults } from "@/lib/weighting/engine";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    // Aktif turu bul
    const [activeRound] = await db.select().from(rounds).where(eq(rounds.is_active, true)).limit(1);
    const activeRoundId = activeRound?.id;
    const roundCondition = activeRoundId ? sql`AND round_id = ${activeRoundId}` : sql``;

    // anonymous_vote_counts'tan gecerli/gecersiz oy sayimi (sadece aktif tur)
    const cityCondition = city ? sql`AND city = ${city}` : sql``;
    const countResult = await db.execute(sql`
      SELECT is_valid, SUM(vote_count)::int as cnt
      FROM anonymous_vote_counts
      WHERE party IS NOT NULL AND party != 'karasizim' ${cityCondition} ${roundCondition}
      GROUP BY is_valid
    `);
    const countRows = countResult.rows as { is_valid: boolean; cnt: number }[];

    const validVotes = countRows.find(r => r.is_valid)?.cnt ?? 0;
    const invalidVotes = countRows.find(r => !r.is_valid)?.cnt ?? 0;
    const totalVotes = validVotes + invalidVotes;
    const cleanVotePercentage =
      totalVotes > 0 ? Math.round((validVotes / totalVotes) * 10000) / 100 : 100;

    // Supheli hesaplar — sebep bazli dagilim
    const flaggedConditions = city
      ? and(eq(users.is_flagged, true), eq(users.city, city))
      : eq(users.is_flagged, true);

    const flaggedRows = await db
      .select({
        flag_reason: users.flag_reason,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(flaggedConditions)
      .groupBy(users.flag_reason);

    const flaggedAccounts = flaggedRows.reduce((sum, r) => sum + r.count, 0);
    const flagReasons: { reason: string; count: number }[] = flaggedRows.map(r => ({
      reason: r.flag_reason || 'Belirtilmemis',
      count: r.count,
    }));

    // DB'den parti kisa adlari
    const dbParties = await db.select().from(partiesTable);
    const slugToShort: Record<string, string> = {};
    for (const p of dbParties) slugToShort[p.slug] = p.short_name;

    // Gecersiz oylarin parti dagilimi (anonymous_vote_counts'tan)
    const invalidPartyDistribution: Record<string, number> = {};
    const invalidDistResult = await db.execute(sql`
      SELECT party, SUM(vote_count)::int as cnt
      FROM anonymous_vote_counts
      WHERE party IS NOT NULL AND party != 'karasizim'
        AND is_valid = false ${cityCondition} ${roundCondition}
      GROUP BY party
    `);
    for (const row of (invalidDistResult.rows as { party: string; cnt: number }[])) {
      const displayName = slugToShort[row.party] || row.party;
      invalidPartyDistribution[displayName] = row.cnt;
    }

    // Agirliklandirma bilgileri — engine'in gercekte calistirdigi yontemleri goster
    let weightingInfo = null;
    try {
      const weighted = await computeWeightedResults();
      if (weighted.methodology.length > 0) {
        weightingInfo = {
          activeMethods: weighted.methodology,
          confidence: weighted.confidence,
          effectiveSampleSize: weighted.effectiveSampleSize,
          sampleSize: weighted.sampleSize,
          methodology: weighted.methodology,
        };
      }
    } catch {
      // Agirliklandirma henuz yapilandirilmamis olabilir
    }

    return NextResponse.json({
      totalVotes,
      validVotes,
      invalidVotes,
      flaggedAccounts,
      flagReasons,
      cleanVotePercentage,
      invalidPartyDistribution,
      weighting: weightingInfo,
    });
  } catch (error) {
    console.error("Transparency error:", error);
    return NextResponse.json(
      { error: "Seffaflik verileri alinirken bir hata olustu" },
      { status: 500 }
    );
  }
}
