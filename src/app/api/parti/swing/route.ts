/**
 * GET /api/parti/swing
 *
 * Karasiz (karasizim) secmenlerin demografik breakdown'u + partinin
 * mevcut secmen profiliyle benzerlik skoru.
 *
 * Benzerlik: 4 dimension (age, gender, education, income) icin
 * parti secmeninin dagilimi ile karasiz secmenin dagilimi arasindaki
 * cosine similarity. 0-100 arasi skor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { parties, rounds } from '@/lib/db/schema';
import { getPartyContext } from '@/lib/auth/party-context';

export const dynamic = 'force-dynamic';

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

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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

  // Toplam karasiz
  const [totalRow] = (await db.execute(sql`
    SELECT SUM(vote_count)::int AS total
    FROM anonymous_vote_counts
    WHERE round_id = ${activeRound.id}
      AND is_valid = true AND is_dummy = false
      AND party = 'karasizim' AND vote_count > 0
  `)).rows as Array<{ total: number }>;

  const karasizTotal = Number(totalRow?.total || 0);

  if (karasizTotal === 0) {
    return NextResponse.json({
      partyName: party.name,
      totalKarasiz: 0,
      breakdowns: [],
      similarityScore: 0,
    });
  }

  const dimensions = ['age_bracket', 'gender', 'education', 'income_bracket'] as const;
  const breakdowns: Array<{
    dimension: string;
    label: string;
    categories: Array<{
      key: string;
      label: string;
      karasizCount: number;
      karasizPct: number;
      partyPct: number;
    }>;
    similarity: number;
  }> = [];

  let totalSimilarity = 0;
  let dimensionCount = 0;

  for (const dim of dimensions) {
    // Karasiz dagilimi (bu dimension uzerinde)
    const karasizRows = (await db.execute(sql.raw(`
      SELECT
        ${dim} AS category,
        SUM(vote_count)::int AS votes
      FROM anonymous_vote_counts
      WHERE round_id = ${activeRound.id}
        AND is_valid = true AND is_dummy = false
        AND party = 'karasizim' AND vote_count > 0
        AND ${dim} IS NOT NULL
      GROUP BY ${dim}
    `))).rows as Array<{ category: string; votes: number }>;

    // Partinin secmeninin dagilimi
    const partyRows = (await db.execute(sql.raw(`
      SELECT
        ${dim} AS category,
        SUM(vote_count)::int AS votes
      FROM anonymous_vote_counts
      WHERE round_id = ${activeRound.id}
        AND is_valid = true AND is_dummy = false
        AND party = '${party.slug.replace(/'/g, "''")}' AND vote_count > 0
        AND ${dim} IS NOT NULL
      GROUP BY ${dim}
    `))).rows as Array<{ category: string; votes: number }>;

    const karasizTotalDim = karasizRows.reduce((s, r) => s + Number(r.votes), 0);
    const partyTotalDim = partyRows.reduce((s, r) => s + Number(r.votes), 0);

    // Tum kategorileri birlestir
    const allCats = new Set<string>();
    karasizRows.forEach((r) => allCats.add(String(r.category)));
    partyRows.forEach((r) => allCats.add(String(r.category)));

    const karasizMap = new Map(karasizRows.map((r) => [String(r.category), Number(r.votes)]));
    const partyMap = new Map(partyRows.map((r) => [String(r.category), Number(r.votes)]));

    const categories = Array.from(allCats).map((cat) => {
      const kCount = karasizMap.get(cat) || 0;
      const pCount = partyMap.get(cat) || 0;
      return {
        key: cat,
        label: CATEGORY_LABELS[dim]?.[cat] || cat,
        karasizCount: kCount,
        karasizPct: karasizTotalDim > 0 ? (kCount / karasizTotalDim) * 100 : 0,
        partyPct: partyTotalDim > 0 ? (pCount / partyTotalDim) * 100 : 0,
      };
    }).sort((a, b) => b.karasizCount - a.karasizCount);

    // Cosine similarity (vektorler: kategori yuzdeleri)
    const kVec = categories.map((c) => c.karasizPct);
    const pVec = categories.map((c) => c.partyPct);
    const similarity = cosineSimilarity(kVec, pVec);

    breakdowns.push({
      dimension: dim,
      label: DIMENSION_LABELS[dim],
      categories,
      similarity: Math.round(similarity * 10000) / 100, // 0-100
    });

    totalSimilarity += similarity;
    dimensionCount++;
  }

  const averageSimilarity = dimensionCount > 0 ? (totalSimilarity / dimensionCount) * 100 : 0;

  return NextResponse.json({
    partyName: party.name,
    partyShortName: party.short_name,
    totalKarasiz: karasizTotal,
    breakdowns,
    similarityScore: Math.round(averageSimilarity * 100) / 100,
  });
}
