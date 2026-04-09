/**
 * GET /api/parti/insights
 *
 * Kural tabanli icgoruler (alerts/opportunities):
 *   - loss: onceki turdan -1.5+ puan kaybettigi sehir/bolge/demografi
 *   - gain: +1.5+ puan kazandigi sehir/bolge/demografi
 *   - comparison: ulusal ortalamadan buyuk sapma
 *   - swing: karasiz secmenin profilindeki benzerlik
 *   - rival: en fazla oy aldigi/kaybettigi rakip
 *   - data_quality: dusuk orneklem uyarilari
 *
 * Her insight: id, type, priority (high|medium|low), title, description,
 *              value (opsiyonel delta), link (opsiyonel sayfa)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { parties, rounds } from '@/lib/db/schema';
import { getPartyContext } from '@/lib/auth/party-context';
import { REGION_LABELS, getCityRegion, type RegionKey } from '@/lib/geo/regions';

export const dynamic = 'force-dynamic';

type InsightType = 'loss' | 'gain' | 'comparison' | 'swing' | 'rival' | 'data_quality';
type Priority = 'high' | 'medium' | 'low';

interface Insight {
  id: string;
  type: InsightType;
  priority: Priority;
  title: string;
  description: string;
  value?: number;
  link?: string;
}

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

  const [prevRound] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.is_published, true), sql`${rounds.id} != ${activeRound.id}`))
    .orderBy(desc(rounds.end_date))
    .limit(1);

  const basePath = ctx.kind === 'demo' ? '/demo/parti' : '/parti';
  const insights: Insight[] = [];

  // ──────────────────────────────────────────────────────────
  // Ulusal ortalama + orneklem
  // ──────────────────────────────────────────────────────────
  const [currentNat] = (await db.execute(sql`
    SELECT
      SUM(CASE WHEN party = ${party.slug} THEN vote_count ELSE 0 END)::int AS party_votes,
      SUM(vote_count)::int AS total_votes
    FROM anonymous_vote_counts
    WHERE round_id = ${activeRound.id}
      AND is_valid = true AND is_dummy = false
      AND party != 'karasizim' AND vote_count > 0
  `)).rows as Array<{ party_votes: number; total_votes: number }>;

  const nationalPct = currentNat && currentNat.total_votes > 0
    ? (Number(currentNat.party_votes) / Number(currentNat.total_votes)) * 100
    : 0;

  // ──────────────────────────────────────────────────────────
  // Trend: onceki turdan ulusal fark
  // ──────────────────────────────────────────────────────────
  if (prevRound) {
    const [prevNat] = (await db.execute(sql`
      SELECT
        SUM(CASE WHEN party = ${party.slug} THEN vote_count ELSE 0 END)::int AS party_votes,
        SUM(vote_count)::int AS total_votes
      FROM anonymous_vote_counts
      WHERE round_id = ${prevRound.id}
        AND is_valid = true AND is_dummy = false
        AND party != 'karasizim' AND vote_count > 0
    `)).rows as Array<{ party_votes: number; total_votes: number }>;

    const prevPct = prevNat && prevNat.total_votes > 0
      ? (Number(prevNat.party_votes) / Number(prevNat.total_votes)) * 100
      : 0;
    const natDelta = nationalPct - prevPct;

    if (Math.abs(natDelta) >= 0.5) {
      insights.push({
        id: 'national-trend',
        type: natDelta > 0 ? 'gain' : 'loss',
        priority: Math.abs(natDelta) >= 2 ? 'high' : 'medium',
        title: natDelta > 0 ? 'Ulusal yukselis' : 'Ulusal gerileme',
        description: `Onceki tura gore ulusal oy oranin ${natDelta > 0 ? '+' : ''}${natDelta.toFixed(1)} puan ${natDelta > 0 ? 'yukseldi' : 'geriledi'}.`,
        value: Math.round(natDelta * 100) / 100,
      });
    }
  }

  // ──────────────────────────────────────────────────────────
  // Sehir bazli: en buyuk kayip ve kazanc
  // ──────────────────────────────────────────────────────────
  if (prevRound) {
    const currentCityRows = (await db.execute(sql`
      SELECT
        city,
        SUM(CASE WHEN party = ${party.slug} THEN vote_count ELSE 0 END)::int AS party_votes,
        SUM(vote_count)::int AS total_votes
      FROM anonymous_vote_counts
      WHERE round_id = ${activeRound.id}
        AND is_valid = true AND is_dummy = false
        AND party != 'karasizim' AND vote_count > 0
      GROUP BY city
    `)).rows as Array<{ city: string; party_votes: number; total_votes: number }>;

    const prevCityRows = (await db.execute(sql`
      SELECT
        city,
        SUM(CASE WHEN party = ${party.slug} THEN vote_count ELSE 0 END)::int AS party_votes,
        SUM(vote_count)::int AS total_votes
      FROM anonymous_vote_counts
      WHERE round_id = ${prevRound.id}
        AND is_valid = true AND is_dummy = false
        AND party != 'karasizim' AND vote_count > 0
      GROUP BY city
    `)).rows as Array<{ city: string; party_votes: number; total_votes: number }>;

    const prevPctMap = new Map<string, number>();
    for (const r of prevCityRows) {
      if (Number(r.total_votes) > 0) {
        prevPctMap.set(r.city, (Number(r.party_votes) / Number(r.total_votes)) * 100);
      }
    }

    const cityDeltas = currentCityRows
      .filter((r) => Number(r.total_votes) >= 20)
      .map((r) => {
        const curPct = (Number(r.party_votes) / Number(r.total_votes)) * 100;
        const prevP = prevPctMap.get(r.city);
        return {
          city: r.city,
          delta: prevP !== undefined ? curPct - prevP : 0,
          sample: Number(r.total_votes),
        };
      })
      .filter((r) => prevPctMap.has(r.city));

    const biggestLoss = [...cityDeltas].sort((a, b) => a.delta - b.delta)[0];
    const biggestGain = [...cityDeltas].sort((a, b) => b.delta - a.delta)[0];

    if (biggestLoss && biggestLoss.delta <= -1.5) {
      insights.push({
        id: `city-loss-${biggestLoss.city}`,
        type: 'loss',
        priority: biggestLoss.delta <= -3 ? 'high' : 'medium',
        title: `${biggestLoss.city}'da kayip`,
        description: `Bu turda ${biggestLoss.delta.toFixed(1)} puan kaybettin. Oncelikle incelenmeli.`,
        value: Math.round(biggestLoss.delta * 100) / 100,
        link: `${basePath}/zayif-noktalar`,
      });
    }

    if (biggestGain && biggestGain.delta >= 1.5) {
      insights.push({
        id: `city-gain-${biggestGain.city}`,
        type: 'gain',
        priority: biggestGain.delta >= 3 ? 'high' : 'medium',
        title: `${biggestGain.city}'da yukselis`,
        description: `Bu turda +${biggestGain.delta.toFixed(1)} puan kazandin. Basarinin nedenleri diger sehirlere de uygulanabilir.`,
        value: Math.round(biggestGain.delta * 100) / 100,
        link: `${basePath}/guclu-noktalar`,
      });
    }
  }

  // ──────────────────────────────────────────────────────────
  // Bolgesel karsilastirma
  // ──────────────────────────────────────────────────────────
  const cityRows = (await db.execute(sql`
    SELECT
      city,
      SUM(CASE WHEN party = ${party.slug} THEN vote_count ELSE 0 END)::int AS party_votes,
      SUM(vote_count)::int AS total_votes
    FROM anonymous_vote_counts
    WHERE round_id = ${activeRound.id}
      AND is_valid = true AND is_dummy = false
      AND party != 'karasizim' AND vote_count > 0
    GROUP BY city
  `)).rows as Array<{ city: string; party_votes: number; total_votes: number }>;

  const regionAgg = new Map<RegionKey, { partyVotes: number; total: number }>();
  for (const r of cityRows) {
    const region = getCityRegion(r.city);
    if (!region) continue;
    if (!regionAgg.has(region)) {
      regionAgg.set(region, { partyVotes: 0, total: 0 });
    }
    const agg = regionAgg.get(region)!;
    agg.partyVotes += Number(r.party_votes);
    agg.total += Number(r.total_votes);
  }

  let worstRegion: { key: RegionKey; pct: number; delta: number } | null = null;
  let bestRegion: { key: RegionKey; pct: number; delta: number } | null = null;
  for (const [key, agg] of regionAgg) {
    if (agg.total < 50) continue;
    const pct = (agg.partyVotes / agg.total) * 100;
    const delta = pct - nationalPct;
    if (!worstRegion || delta < worstRegion.delta) worstRegion = { key, pct, delta };
    if (!bestRegion || delta > bestRegion.delta) bestRegion = { key, pct, delta };
  }

  if (worstRegion && worstRegion.delta <= -3) {
    insights.push({
      id: `region-weak-${worstRegion.key}`,
      type: 'comparison',
      priority: worstRegion.delta <= -5 ? 'high' : 'medium',
      title: `${REGION_LABELS[worstRegion.key]} bolgesinde zayifsin`,
      description: `Ulusal ortalaman ${nationalPct.toFixed(1)}% iken, bu bolgede ${worstRegion.pct.toFixed(1)}% oy aliyorsun (${worstRegion.delta.toFixed(1)} puan altinda).`,
      value: Math.round(worstRegion.delta * 100) / 100,
      link: `${basePath}/bolgesel`,
    });
  }

  if (bestRegion && bestRegion.delta >= 3) {
    insights.push({
      id: `region-strong-${bestRegion.key}`,
      type: 'comparison',
      priority: 'low',
      title: `${REGION_LABELS[bestRegion.key]} bolgesinde gucluyosun`,
      description: `Ulusal ortalamanin ${bestRegion.delta.toFixed(1)} puan uzerindesin (${bestRegion.pct.toFixed(1)}%).`,
      value: Math.round(bestRegion.delta * 100) / 100,
      link: `${basePath}/bolgesel`,
    });
  }

  // ──────────────────────────────────────────────────────────
  // Karasiz secmenin hacmi (swing)
  // ──────────────────────────────────────────────────────────
  const [karasizRow] = (await db.execute(sql`
    SELECT SUM(vote_count)::int AS karasiz_total
    FROM anonymous_vote_counts
    WHERE round_id = ${activeRound.id}
      AND is_valid = true AND is_dummy = false
      AND party = 'karasizim' AND vote_count > 0
  `)).rows as Array<{ karasiz_total: number }>;

  const karasizTotal = Number(karasizRow?.karasiz_total || 0);
  const grandTotalWithKarasiz = Number(currentNat?.total_votes || 0) + karasizTotal;
  const karasizPct = grandTotalWithKarasiz > 0 ? (karasizTotal / grandTotalWithKarasiz) * 100 : 0;

  if (karasizPct >= 10) {
    insights.push({
      id: 'swing-volume',
      type: 'swing',
      priority: karasizPct >= 20 ? 'high' : 'medium',
      title: 'Yuksek karasiz secmen',
      description: `Secmenin ${karasizPct.toFixed(1)}% hala kararsiz. Bu kitlenin profili swing analizinde incelenebilir.`,
      value: Math.round(karasizPct * 100) / 100,
      link: `${basePath}/swing`,
    });
  }

  // ──────────────────────────────────────────────────────────
  // Data quality: dusuk orneklem
  // ──────────────────────────────────────────────────────────
  const lowSampleCities = cityRows.filter((r) => Number(r.total_votes) < 15).length;
  if (lowSampleCities > 10) {
    insights.push({
      id: 'data-low-sample',
      type: 'data_quality',
      priority: 'low',
      title: `${lowSampleCities} sehir dusuk orneklemli`,
      description: 'Bu sehirlerde 15 oydan az veri var. Sonuclar istatistiksel olarak guvensiz.',
      value: lowSampleCities,
    });
  }

  // Priority sirala: high -> medium -> low
  const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  return NextResponse.json({
    partyName: party.name,
    partyShortName: party.short_name,
    generatedAt: new Date().toISOString(),
    total: insights.length,
    insights,
  });
}
