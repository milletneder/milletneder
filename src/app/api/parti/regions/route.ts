/**
 * GET /api/parti/regions
 *
 * 7 Turkiye bolgesi icin parti breakdown'u dondurur.
 * Her bolge icin: toplam oy, partinin yuzdesi, ulusal ortalamadan fark,
 * bolgedeki sirasi, en guclu oldugu sehir, en zayif oldugu sehir.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { parties, rounds } from '@/lib/db/schema';
import { getPartyContext } from '@/lib/auth/party-context';
import { REGIONS, REGION_LABELS, getCityRegion, type RegionKey } from '@/lib/geo/regions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await getPartyContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  const [party] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, ctx.partyId))
    .limit(1);
  if (!party) {
    return NextResponse.json({ error: 'Parti bulunamadi' }, { status: 404 });
  }

  const [activeRound] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.is_active, true))
    .limit(1);
  if (!activeRound) {
    return NextResponse.json({ error: 'Aktif tur bulunamadi' }, { status: 404 });
  }

  // Sehir + parti bazli veri
  const result = await db.execute(sql`
    SELECT
      city,
      party,
      SUM(vote_count)::int AS votes
    FROM anonymous_vote_counts
    WHERE round_id = ${activeRound.id}
      AND is_valid = true AND is_dummy = false
      AND party != 'karasizim' AND vote_count > 0
    GROUP BY city, party
  `);

  const rows = result.rows as Array<{ city: string; party: string; votes: number }>;

  // Bolge agregasyonu
  type RegionAgg = {
    partyVotes: number;
    totalVotes: number;
    partyByCities: Map<string, { partyVotes: number; totalVotes: number }>;
    partyRanks: Map<string, number>;
  };
  const regionAggs = new Map<RegionKey, RegionAgg>();

  // Initialize
  for (const key of Object.keys(REGIONS) as RegionKey[]) {
    regionAggs.set(key, {
      partyVotes: 0,
      totalVotes: 0,
      partyByCities: new Map(),
      partyRanks: new Map(),
    });
  }

  let nationalPartyVotes = 0;
  let nationalTotal = 0;

  for (const r of rows) {
    const region = getCityRegion(r.city);
    if (!region) continue;

    const agg = regionAggs.get(region)!;
    const votes = Number(r.votes);

    agg.totalVotes += votes;
    nationalTotal += votes;

    // City-level city kaydi
    if (!agg.partyByCities.has(r.city)) {
      agg.partyByCities.set(r.city, { partyVotes: 0, totalVotes: 0 });
    }
    const cityRec = agg.partyByCities.get(r.city)!;
    cityRec.totalVotes += votes;

    if (r.party === party.slug) {
      agg.partyVotes += votes;
      cityRec.partyVotes += votes;
      nationalPartyVotes += votes;
    }

    // Parti ranks icin tum partilerin bolge toplamlarini tut
    agg.partyRanks.set(r.party, (agg.partyRanks.get(r.party) || 0) + votes);
  }

  const nationalPct = nationalTotal > 0 ? (nationalPartyVotes / nationalTotal) * 100 : 0;

  const regionsOut = Array.from(regionAggs.entries()).map(([key, agg]) => {
    const partyPct = agg.totalVotes > 0 ? (agg.partyVotes / agg.totalVotes) * 100 : 0;

    // Bolge siralamasi
    const sorted = Array.from(agg.partyRanks.entries()).sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(([p]) => p === party.slug) + 1;

    // En guclu/zayif sehir (bu bolgede)
    const cityList = Array.from(agg.partyByCities.entries()).map(([city, data]) => ({
      city,
      pct: data.totalVotes > 0 ? (data.partyVotes / data.totalVotes) * 100 : 0,
      sample: data.totalVotes,
    }));
    cityList.sort((a, b) => b.pct - a.pct);
    const strongestCity = cityList[0] || null;
    const weakestCity = cityList[cityList.length - 1] || null;

    return {
      key,
      label: REGION_LABELS[key],
      partyPct: Math.round(partyPct * 100) / 100,
      delta: Math.round((partyPct - nationalPct) * 100) / 100,
      rank: rank || (sorted.length + 1),
      totalParties: sorted.length,
      totalVotes: agg.totalVotes,
      partyVotes: agg.partyVotes,
      strongestCity,
      weakestCity,
    };
  });

  // Partinin performansina gore sirala (en iyiden en kotuye)
  regionsOut.sort((a, b) => b.partyPct - a.partyPct);

  return NextResponse.json({
    partyName: party.name,
    partyShortName: party.short_name,
    nationalPct: Math.round(nationalPct * 100) / 100,
    regions: regionsOut,
  });
}
