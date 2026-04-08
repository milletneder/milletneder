import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  subscriptions,
  parties,
  anonymousVoteCounts,
  rounds,
} from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { hasFeature, FEATURES } from '@/lib/billing/features';
import type { PlanTier } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

const DIMENSION_LABELS: Record<string, string> = {
  age_bracket: 'Yas Grubu',
  gender: 'Cinsiyet',
  education: 'Egitim',
  income_bracket: 'Gelir',
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  age_bracket: { '1': '18-24', '2': '25-34', '3': '35-44', '4': '45-54', '5': '55-64', '6': '65+' },
  gender: { M: 'Erkek', F: 'Kadin' },
  education: { '1': 'Ilkokul', '2': 'Ortaokul', '3': 'Lise', '4': 'Universite', '5': 'Lisansustu' },
  income_bracket: { '1': 'Dusuk', '2': 'Orta-Alt', '3': 'Orta', '4': 'Orta-Ust', '5': 'Yuksek' },
};

export async function GET(request: NextRequest) {
  // Auth
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  // Feature gate
  const tier = (user.subscription_tier || 'free') as PlanTier;
  if (!hasFeature(tier, FEATURES.VOTER_PROFILE)) {
    return NextResponse.json({ error: 'Bu ozellik icin yetkiniz yok' }, { status: 403 });
  }

  // Get user's party
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_id, user.id))
    .limit(1);

  if (!sub || !sub.party_id) {
    return NextResponse.json({ error: 'Parti aboneligi bulunamadi' }, { status: 404 });
  }

  const [party] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, sub.party_id))
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

  const baseWhere = and(
    eq(anonymousVoteCounts.round_id, activeRound.id),
    eq(anonymousVoteCounts.party, party.slug),
    eq(anonymousVoteCounts.is_valid, true),
    eq(anonymousVoteCounts.is_dummy, false),
  );

  // Total voters for this party
  const [totalRow] = await db
    .select({
      total: sql<number>`SUM(${anonymousVoteCounts.vote_count})`.as('total'),
    })
    .from(anonymousVoteCounts)
    .where(baseWhere);

  const totalVoters = Number(totalRow?.total || 0);

  // Demographic breakdowns
  const dimensions = ['age_bracket', 'gender', 'education', 'income_bracket'] as const;
  const demographics = [];

  for (const dim of dimensions) {
    const colRef = anonymousVoteCounts[dim];

    const breakdown = await db
      .select({
        category: colRef,
        count: sql<number>`SUM(${anonymousVoteCounts.vote_count})`.as('count'),
      })
      .from(anonymousVoteCounts)
      .where(and(baseWhere, sql`${colRef} IS NOT NULL`))
      .groupBy(colRef)
      .orderBy(colRef);

    const categories = breakdown.map((row) => {
      const cat = String(row.category);
      const count = Number(row.count);
      return {
        category: cat,
        label: CATEGORY_LABELS[dim]?.[cat] || cat,
        count,
        pct: totalVoters > 0 ? Number(((count / totalVoters) * 100).toFixed(1)) : 0,
      };
    });

    demographics.push({
      dimension: dim,
      label: DIMENSION_LABELS[dim] || dim,
      categories,
    });
  }

  return NextResponse.json({
    partyName: party.name,
    totalVoters,
    demographics,
  });
}
