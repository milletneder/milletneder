/**
 * GET /api/parti/strength-weakness?scope=city|district|demographic
 *
 * Partinin en guclu ve en zayif oldugu boyutlari dondurur:
 *   - scope=city: sehirler (top 15 en guclu + top 15 en zayif)
 *   - scope=district: ilceler (top 20 + alt 20)
 *   - scope=demographic: age/gender/education/income segmentleri
 *
 * Her kayit: key, partyPct, nationalPct, delta (parti - ulusal),
 *            sampleSize, trend (onceki turdan fark, opsiyonel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { parties, rounds } from '@/lib/db/schema';
import { getPartyContext } from '@/lib/auth/party-context';

export const dynamic = 'force-dynamic';

type Scope = 'city' | 'district' | 'demographic';

const DIMENSION_LABELS: Record<string, string> = {
  age_bracket: 'Yas Grubu',
  gender: 'Cinsiyet',
  education: 'Egitim',
  income_bracket: 'Gelir',
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  age_bracket: { '1': '18-24', '2': '25-34', '3': '35-44', '4': '45-54', '5': '55-64', '6': '65+' },
  gender: { M: 'Erkek', F: 'Kadin', E: 'Erkek', K: 'Kadin' },
  education: { '1': 'Ilkokul', '2': 'Ortaokul', '3': 'Lise', '4': 'Universite', '5': 'Lisansustu' },
  income_bracket: { '1': 'Dusuk', '2': 'Orta-Alt', '3': 'Orta', '4': 'Orta-Ust', '5': 'Yuksek' },
};

export async function GET(request: NextRequest) {
  const ctx = await getPartyContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  const scope = (request.nextUrl.searchParams.get('scope') || 'city') as Scope;
  if (!['city', 'district', 'demographic'].includes(scope)) {
    return NextResponse.json({ error: 'Gecersiz scope. city|district|demographic' }, { status: 400 });
  }

  // Party
  const [party] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, ctx.partyId))
    .limit(1);
  if (!party) {
    return NextResponse.json({ error: 'Parti bulunamadi' }, { status: 404 });
  }

  // Active round
  const [activeRound] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.is_active, true))
    .limit(1);
  if (!activeRound) {
    return NextResponse.json({ error: 'Aktif tur bulunamadi' }, { status: 404 });
  }

  // Onceki tur (trend icin)
  const [prevRound] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.is_published, true), sql`${rounds.id} != ${activeRound.id}`))
    .orderBy(desc(rounds.end_date))
    .limit(1);

  // Ulusal ortalama
  const [nationalTotals] = await db.execute(sql`
    SELECT
      SUM(CASE WHEN party = ${party.slug} THEN vote_count ELSE 0 END)::int AS party_total,
      SUM(vote_count)::int AS grand_total
    FROM anonymous_vote_counts
    WHERE round_id = ${activeRound.id}
      AND is_valid = true AND is_dummy = false
      AND party != 'karasizim' AND vote_count > 0
  `).then((r) => r.rows as Array<{ party_total: number; grand_total: number }>);

  const nationalPct = nationalTotals && nationalTotals.grand_total > 0
    ? (Number(nationalTotals.party_total) / Number(nationalTotals.grand_total)) * 100
    : 0;

  // ──────────────────────────────────────────────────────────
  // scope = city
  // ──────────────────────────────────────────────────────────
  if (scope === 'city') {
    const result = await db.execute(sql`
      SELECT
        city AS key,
        SUM(CASE WHEN party = ${party.slug} THEN vote_count ELSE 0 END)::int AS party_votes,
        SUM(vote_count)::int AS total_votes
      FROM anonymous_vote_counts
      WHERE round_id = ${activeRound.id}
        AND is_valid = true AND is_dummy = false
        AND party != 'karasizim' AND vote_count > 0
      GROUP BY city
      HAVING SUM(vote_count) > 0
    `);

    // Trend icin onceki tur
    const prevMap = new Map<string, number>();
    if (prevRound) {
      const prevResult = await db.execute(sql`
        SELECT
          city AS key,
          SUM(CASE WHEN party = ${party.slug} THEN vote_count ELSE 0 END)::int AS party_votes,
          SUM(vote_count)::int AS total_votes
        FROM anonymous_vote_counts
        WHERE round_id = ${prevRound.id}
          AND is_valid = true AND is_dummy = false
          AND party != 'karasizim' AND vote_count > 0
        GROUP BY city
      `);
      for (const r of prevResult.rows as Array<{ key: string; party_votes: number; total_votes: number }>) {
        if (Number(r.total_votes) > 0) {
          prevMap.set(r.key, (Number(r.party_votes) / Number(r.total_votes)) * 100);
        }
      }
    }

    const rows = (result.rows as Array<{ key: string; party_votes: number; total_votes: number }>).map((r) => {
      const total = Number(r.total_votes);
      const partyVotes = Number(r.party_votes);
      const pct = total > 0 ? (partyVotes / total) * 100 : 0;
      const delta = Math.round((pct - nationalPct) * 100) / 100;
      const prevPct = prevMap.get(r.key);
      const trend = prevPct !== undefined ? Math.round((pct - prevPct) * 100) / 100 : null;
      return {
        key: r.key,
        label: r.key,
        partyPct: Math.round(pct * 100) / 100,
        delta,
        sampleSize: total,
        trend,
      };
    });

    const sorted = [...rows].sort((a, b) => b.partyPct - a.partyPct);
    return NextResponse.json({
      scope: 'city',
      nationalPct: Math.round(nationalPct * 100) / 100,
      partyName: party.name,
      strongest: sorted.slice(0, 15),
      weakest: sorted.slice(-15).reverse(),
      total: rows.length,
    });
  }

  // ──────────────────────────────────────────────────────────
  // scope = district
  // ──────────────────────────────────────────────────────────
  if (scope === 'district') {
    const result = await db.execute(sql`
      SELECT
        city || ' / ' || COALESCE(district, 'Belirtilmemis') AS key,
        city AS city,
        COALESCE(district, 'Belirtilmemis') AS district,
        SUM(CASE WHEN party = ${party.slug} THEN vote_count ELSE 0 END)::int AS party_votes,
        SUM(vote_count)::int AS total_votes
      FROM anonymous_vote_counts
      WHERE round_id = ${activeRound.id}
        AND is_valid = true AND is_dummy = false
        AND party != 'karasizim' AND vote_count > 0
        AND district IS NOT NULL
      GROUP BY city, district
      HAVING SUM(vote_count) > 0
    `);

    const rows = (result.rows as Array<{
      key: string; city: string; district: string;
      party_votes: number; total_votes: number;
    }>).map((r) => {
      const total = Number(r.total_votes);
      const partyVotes = Number(r.party_votes);
      const pct = total > 0 ? (partyVotes / total) * 100 : 0;
      const delta = Math.round((pct - nationalPct) * 100) / 100;
      return {
        key: r.key,
        label: r.key,
        partyPct: Math.round(pct * 100) / 100,
        delta,
        sampleSize: total,
        trend: null,
      };
    });

    // Cok kucuk orneklem gurultusu cikarmak icin minimum 10 oy sart
    const filtered = rows.filter((r) => r.sampleSize >= 10);
    const sorted = [...filtered].sort((a, b) => b.partyPct - a.partyPct);

    return NextResponse.json({
      scope: 'district',
      nationalPct: Math.round(nationalPct * 100) / 100,
      partyName: party.name,
      strongest: sorted.slice(0, 20),
      weakest: sorted.slice(-20).reverse(),
      total: filtered.length,
    });
  }

  // ──────────────────────────────────────────────────────────
  // scope = demographic
  // ──────────────────────────────────────────────────────────
  // 4 dimension'u ayni anda cevir
  const dimensions = ['age_bracket', 'gender', 'education', 'income_bracket'] as const;
  const breakdowns: Array<{
    dimension: string;
    label: string;
    categories: Array<{
      key: string;
      label: string;
      partyPct: number;
      delta: number;
      sampleSize: number;
      trend: null;
    }>;
  }> = [];

  for (const dim of dimensions) {
    const result = await db.execute(sql.raw(`
      SELECT
        ${dim} AS category,
        SUM(CASE WHEN party = '${party.slug.replace(/'/g, "''")}' THEN vote_count ELSE 0 END)::int AS party_votes,
        SUM(vote_count)::int AS total_votes
      FROM anonymous_vote_counts
      WHERE round_id = ${activeRound.id}
        AND is_valid = true AND is_dummy = false
        AND party != 'karasizim' AND vote_count > 0
        AND ${dim} IS NOT NULL
      GROUP BY ${dim}
      HAVING SUM(vote_count) > 0
    `));

    const rows = (result.rows as Array<{ category: string; party_votes: number; total_votes: number }>).map((r) => {
      const total = Number(r.total_votes);
      const partyVotes = Number(r.party_votes);
      const pct = total > 0 ? (partyVotes / total) * 100 : 0;
      const delta = Math.round((pct - nationalPct) * 100) / 100;
      const cat = String(r.category);
      return {
        key: cat,
        label: CATEGORY_LABELS[dim]?.[cat] || cat,
        partyPct: Math.round(pct * 100) / 100,
        delta,
        sampleSize: total,
        trend: null,
      };
    });

    breakdowns.push({
      dimension: dim,
      label: DIMENSION_LABELS[dim],
      categories: rows.sort((a, b) => b.partyPct - a.partyPct),
    });
  }

  return NextResponse.json({
    scope: 'demographic',
    nationalPct: Math.round(nationalPct * 100) / 100,
    partyName: party.name,
    breakdowns,
  });
}
