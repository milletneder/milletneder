/**
 * GET /api/parti/map?view=absolute|strength|weakness|trend
 *
 * Parti odakli harita verisi dondurur. Mevcut computeCityWeightedResults
 * mantigini kullanir, ama partinin kendi yuzdesini hesaplar ve view moduna
 * gore TurkeyMap'in beklediği CityResult[] formatinda cikarir.
 *
 * View modlari:
 * - absolute: Sehir lideri (standart harita)
 * - strength: Partinin sehirdeki yuzdesi — intensity renklendirme
 * - weakness: Ulusal ortalamadan ne kadar asagi (negatif fark)
 * - trend:    Onceki turdan yuzde puan degisim
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  parties as partiesTable,
  anonymousVoteCounts,
  rounds,
} from '@/lib/db/schema';
import { getPartyContext, partyContextHasFeature } from '@/lib/auth/party-context';
import { FEATURES } from '@/lib/billing/features';

export const dynamic = 'force-dynamic';

type ViewMode = 'absolute' | 'strength' | 'weakness' | 'trend';

export async function GET(request: NextRequest) {
  const ctx = await getPartyContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  if (!partyContextHasFeature(ctx, FEATURES.GEO_PERFORMANCE)) {
    return NextResponse.json({ error: 'Bu ozellik icin yetkiniz yok' }, { status: 403 });
  }

  const view = (request.nextUrl.searchParams.get('view') || 'strength') as ViewMode;

  // Party info
  const [party] = await db
    .select()
    .from(partiesTable)
    .where(eq(partiesTable.id, ctx.partyId))
    .limit(1);

  if (!party) {
    return NextResponse.json({ error: 'Parti bulunamadi' }, { status: 404 });
  }

  // Tum turlar (published + active) — harita tum zamanlari gosterir
  const allRounds = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(sql`${rounds.is_active} = true OR ${rounds.is_published} = true`);

  if (allRounds.length === 0) {
    return NextResponse.json({ error: 'Tur bulunamadi' }, { status: 404 });
  }

  const allRoundIds = allRounds.map((r) => r.id);

  // Aktif tur (trend hesabi icin)
  const [activeRound] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.is_active, true))
    .limit(1);

  // Tum partiler (renk/slug icin lookup)
  const dbParties = await db.select().from(partiesTable);
  const slugToMeta = new Map(dbParties.map((p) => [p.slug, { short: p.short_name, color: p.color }]));

  // Tum turlar: sehir+parti bazli agregasyon
  const currentRows = await db.execute(sql`
    SELECT city, party, SUM(vote_count)::int AS vote_count
    FROM anonymous_vote_counts
    WHERE round_id = ANY(${allRoundIds})
      AND is_valid = true
      AND is_dummy = false
      AND party != 'karasizim'
      AND vote_count > 0
      AND city IS NOT NULL AND city != ''
    GROUP BY city, party
  `);

  const rows = currentRows.rows as Array<{ city: string; party: string; vote_count: number }>;

  // Sehir bazli toplam ve parti dagilimi
  type CityData = { total: number; parties: Map<string, number> };
  const cityMap = new Map<string, CityData>();
  let nationalTotal = 0;
  let partyNationalTotal = 0;

  for (const row of rows) {
    if (!cityMap.has(row.city)) {
      cityMap.set(row.city, { total: 0, parties: new Map() });
    }
    const data = cityMap.get(row.city)!;
    data.total += row.vote_count;
    data.parties.set(row.party, (data.parties.get(row.party) || 0) + row.vote_count);
    nationalTotal += row.vote_count;
    if (row.party === party.slug) {
      partyNationalTotal += row.vote_count;
    }
  }

  const nationalPct = nationalTotal > 0 ? (partyNationalTotal / nationalTotal) * 100 : 0;

  // Trend mod icin: son yayinlanan tur verileriyle karsilastir
  // (tum turlar toplami - son tur = "onceki doneme gore fark")
  const trendMap = new Map<string, number>();
  if (view === 'trend') {
    const previousRounds = await db
      .select()
      .from(rounds)
      .where(eq(rounds.is_published, true))
      .orderBy(desc(rounds.end_date))
      .limit(1);

    if (previousRounds.length > 0) {
      const prevId = previousRounds[0].id;
      const prevRows = await db.execute(sql`
        SELECT city, party, SUM(vote_count)::int AS vote_count
        FROM anonymous_vote_counts
        WHERE round_id = ${prevId}
          AND is_valid = true
          AND is_dummy = false
          AND party != 'karasizim'
          AND vote_count > 0
        GROUP BY city, party
      `);
      const prevRowsTyped = prevRows.rows as Array<{ city: string; party: string; vote_count: number }>;

      // Sehir bazli parti orani (once tum rows'lari topla)
      const prevCityTotals = new Map<string, number>();
      const prevCityPartyCount = new Map<string, number>();
      for (const r of prevRowsTyped) {
        prevCityTotals.set(r.city, (prevCityTotals.get(r.city) || 0) + r.vote_count);
        if (r.party === party.slug) {
          prevCityPartyCount.set(r.city, (prevCityPartyCount.get(r.city) || 0) + r.vote_count);
        }
      }

      for (const [city, total] of prevCityTotals) {
        if (total > 0) {
          const prevPct = ((prevCityPartyCount.get(city) || 0) / total) * 100;
          trendMap.set(city, prevPct);
        }
      }
    }
  }

  // CityResult[] olustur
  const cities = Array.from(cityMap.entries()).map(([city, data]) => {
    const partyCount = data.parties.get(party.slug) || 0;
    const partyPct = data.total > 0 ? (partyCount / data.total) * 100 : 0;

    // partyDistribution — TurkeyMap tooltip icin gerekli
    const partyDistribution = Array.from(data.parties.entries())
      .map(([slug, count]) => {
        const meta = slugToMeta.get(slug);
        return {
          party: meta?.short || slug,
          color: meta?.color || '#d4d4d4',
          count,
          percentage: data.total > 0 ? (count / data.total) * 100 : 0,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    const meta = slugToMeta.get(party.slug);
    const partyColor = meta?.color || '#d4d4d4';

    // View moduna gore voteCount'u kullaniciya anlamli deger ver
    // (intensityColor bu deger uzerinden renklendirir)
    let voteCount = 0;
    let metricLabel = '';
    switch (view) {
      case 'absolute':
        voteCount = data.total;
        metricLabel = 'Toplam oy';
        break;
      case 'strength':
        voteCount = Math.round(partyPct * 100);
        metricLabel = `%${partyPct.toFixed(1)}`;
        break;
      case 'weakness': {
        // Negatif fark (ulusal ortalamanin altinda) — pozitif bir sayi olarak
        // TurkeyMap intensity 0-max araliginda isler
        const gap = nationalPct - partyPct;
        voteCount = Math.max(0, Math.round(gap * 100));
        metricLabel = gap > 0 ? `-${gap.toFixed(1)} puan` : `+${(-gap).toFixed(1)} puan`;
        break;
      }
      case 'trend': {
        const prevPct = trendMap.get(city) ?? partyPct;
        const delta = partyPct - prevPct;
        // Pozitif delta → intensity yukari (kazanc)
        // Negatif delta → 0'a yakinlasir (kayip gri tonlar)
        voteCount = Math.round((delta + 10) * 50); // 10 puan kayip-kazanc normalize
        metricLabel = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} puan`;
        break;
      }
    }

    return {
      cityId: city,
      cityName: city,
      voteCount,
      totalVotes: data.total,
      leadingParty: meta?.short || party.slug,
      partyColor: view === 'absolute'
        ? (partyDistribution[0]?.color || '#d4d4d4')
        : partyColor,
      partyDistribution,
      // Parti odaklı ek alanlar (frontend kullanir)
      partyPct: Math.round(partyPct * 100) / 100,
      partyDelta: Math.round((partyPct - nationalPct) * 100) / 100,
      partyTrendDelta: view === 'trend' ? Math.round((partyPct - (trendMap.get(city) ?? partyPct)) * 100) / 100 : 0,
      metricLabel,
    };
  });

  return NextResponse.json({
    party: {
      id: party.id,
      name: party.name,
      short_name: party.short_name,
      slug: party.slug,
      color: party.color,
    },
    view,
    nationalPct: Math.round(nationalPct * 100) / 100,
    cities,
  });
}
