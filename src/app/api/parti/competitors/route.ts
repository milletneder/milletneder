import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  parties,
  anonymousVoteCounts,
  rounds,
} from '@/lib/db/schema';
import { getPartyContext, partyContextHasFeature } from '@/lib/auth/party-context';
import { FEATURES } from '@/lib/billing/features';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await getPartyContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  if (!partyContextHasFeature(ctx, FEATURES.COMPETITOR_PANEL)) {
    return NextResponse.json({ error: 'Bu ozellik icin yetkiniz yok' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;

  // List available parties
  if (searchParams.get('list') === 'true') {
    const allParties = await db
      .select({
        slug: parties.slug,
        name: parties.name,
        short_name: parties.short_name,
      })
      .from(parties)
      .where(eq(parties.is_active, true))
      .orderBy(parties.sort_order);

    return NextResponse.json({ parties: allParties });
  }

  // Rivals comparison
  const rivalsParam = searchParams.get('rivals');
  if (!rivalsParam) {
    return NextResponse.json({ comparison: [] });
  }

  const rivalSlugs = rivalsParam.split(',').slice(0, 3).map((s) => s.trim()).filter(Boolean);
  if (rivalSlugs.length === 0) {
    return NextResponse.json({ comparison: [] });
  }

  // Include user's own party (from party context)
  const [myParty] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, ctx.partyId))
    .limit(1);

  const myPartySlug = myParty?.slug ?? '';

  const allSlugs = [...new Set([myPartySlug, ...rivalSlugs].filter(Boolean))];

  // Active round
  const [activeRound] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.is_active, true))
    .limit(1);

  if (!activeRound) {
    return NextResponse.json({ error: 'Aktif tur bulunamadi' }, { status: 404 });
  }

  // Get vote totals per party for current round
  const results = await db
    .select({
      party: anonymousVoteCounts.party,
      total: sql<number>`SUM(${anonymousVoteCounts.vote_count})`.as('total'),
    })
    .from(anonymousVoteCounts)
    .where(
      and(
        eq(anonymousVoteCounts.round_id, activeRound.id),
        eq(anonymousVoteCounts.is_valid, true),
        eq(anonymousVoteCounts.is_dummy, false),
      )
    )
    .groupBy(anonymousVoteCounts.party);

  const grandTotal = results.reduce((sum, r) => sum + Number(r.total), 0);
  const sorted = [...results].sort((a, b) => Number(b.total) - Number(a.total));

  // Get party info for all slugs
  const partyInfos = await db
    .select()
    .from(parties)
    .where(inArray(parties.slug, allSlugs));

  const partyMap = Object.fromEntries(partyInfos.map((p) => [p.slug, p]));

  // City leadership per party
  const cityLeadership = await db
    .select({
      city: anonymousVoteCounts.city,
      party: anonymousVoteCounts.party,
      total: sql<number>`SUM(${anonymousVoteCounts.vote_count})`.as('total'),
    })
    .from(anonymousVoteCounts)
    .where(
      and(
        eq(anonymousVoteCounts.round_id, activeRound.id),
        eq(anonymousVoteCounts.is_valid, true),
        eq(anonymousVoteCounts.is_dummy, false),
      )
    )
    .groupBy(anonymousVoteCounts.city, anonymousVoteCounts.party);

  // Determine leader per city
  const cityLeaders: Record<string, { party: string; total: number }> = {};
  for (const row of cityLeadership) {
    const city = row.city;
    if (!cityLeaders[city] || Number(row.total) > cityLeaders[city].total) {
      cityLeaders[city] = { party: row.party, total: Number(row.total) };
    }
  }

  const comparison = allSlugs.map((slug) => {
    const partyResult = results.find((r) => r.party === slug);
    const totalVotes = partyResult ? Number(partyResult.total) : 0;
    const pollPct = grandTotal > 0 ? (totalVotes / grandTotal) * 100 : 0;
    const rank = sorted.findIndex((r) => r.party === slug) + 1;
    const leadingCities = Object.values(cityLeaders).filter((c) => c.party === slug).length;
    const info = partyMap[slug];

    return {
      party: {
        slug,
        name: info?.name || slug,
        short_name: info?.short_name || slug,
      },
      pollPct: Number(pollPct.toFixed(1)),
      rank: rank || sorted.length + 1,
      leadingCities,
      totalVotes,
    };
  });

  return NextResponse.json({ comparison });
}
