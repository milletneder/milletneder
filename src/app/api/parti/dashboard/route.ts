import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
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
  // Auth (JWT veya demo token)
  const ctx = await getPartyContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  // Get party info
  const [party] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, ctx.partyId))
    .limit(1);

  if (!party) {
    return NextResponse.json({ error: 'Parti bulunamadi' }, { status: 404 });
  }

  // Get active round
  const [activeRound] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.is_active, true))
    .limit(1);

  if (!activeRound) {
    return NextResponse.json({ error: 'Aktif tur bulunamadi' }, { status: 404 });
  }

  // Get current round totals per party
  const currentResults = await db
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

  const grandTotal = currentResults.reduce((sum, r) => sum + Number(r.total), 0);

  // Sort by votes desc for ranking
  const sorted = [...currentResults].sort((a, b) => Number(b.total) - Number(a.total));
  const myResult = currentResults.find((r) => r.party === party.slug);
  const myVotes = myResult ? Number(myResult.total) : 0;
  const myPct = grandTotal > 0 ? (myVotes / grandTotal) * 100 : 0;
  const myRank = sorted.findIndex((r) => r.party === party.slug) + 1;

  // City count where party has votes
  const cityCountResult = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${anonymousVoteCounts.city})`.as('count'),
    })
    .from(anonymousVoteCounts)
    .where(
      and(
        eq(anonymousVoteCounts.round_id, activeRound.id),
        eq(anonymousVoteCounts.party, party.slug),
        eq(anonymousVoteCounts.is_valid, true),
        eq(anonymousVoteCounts.is_dummy, false),
      )
    );

  const cityCount = cityCountResult[0]?.count || 0;

  // Previous round for change calculation
  const previousRounds = await db
    .select()
    .from(rounds)
    .where(eq(rounds.is_published, true))
    .orderBy(desc(rounds.end_date))
    .limit(5);

  let changeFromLastRound = 0;
  const trendData: { round: string; pct: number }[] = [];

  for (const prevRound of previousRounds.reverse()) {
    const prevResults = await db
      .select({
        party: anonymousVoteCounts.party,
        total: sql<number>`SUM(${anonymousVoteCounts.vote_count})`.as('total'),
      })
      .from(anonymousVoteCounts)
      .where(
        and(
          eq(anonymousVoteCounts.round_id, prevRound.id),
          eq(anonymousVoteCounts.is_valid, true),
          eq(anonymousVoteCounts.is_dummy, false),
        )
      )
      .groupBy(anonymousVoteCounts.party);

    const prevGrand = prevResults.reduce((sum, r) => sum + Number(r.total), 0);
    const prevMyResult = prevResults.find((r) => r.party === party.slug);
    const prevMyVotes = prevMyResult ? Number(prevMyResult.total) : 0;
    const prevPct = prevGrand > 0 ? (prevMyVotes / prevGrand) * 100 : 0;

    const roundLabel = new Date(prevRound.start_date).toLocaleDateString('tr-TR', {
      month: 'short',
      year: 'numeric',
    });

    trendData.push({ round: roundLabel, pct: Number(prevPct.toFixed(1)) });
  }

  // Add current round to trend
  const currentLabel = new Date(activeRound.start_date).toLocaleDateString('tr-TR', {
    month: 'short',
    year: 'numeric',
  });
  trendData.push({ round: currentLabel, pct: Number(myPct.toFixed(1)) });

  // Change from last published round
  if (trendData.length >= 2) {
    changeFromLastRound = trendData[trendData.length - 1].pct - trendData[trendData.length - 2].pct;
  }

  const response: Record<string, unknown> = {
    party: {
      id: party.id,
      name: party.name,
      short_name: party.short_name,
      slug: party.slug,
      color: party.color,
    },
    currentPollPct: Number(myPct.toFixed(1)),
    rank: myRank || sorted.length + 1,
    totalParties: sorted.length,
    changeFromLastRound: Number(changeFromLastRound.toFixed(1)),
    totalVotes: myVotes,
    cityCount: Number(cityCount),
    trendData,
  };

  // Optional includes
  const include = request.nextUrl.searchParams.get('include');

  if (include === 'lossGain' && partyContextHasFeature(ctx, FEATURES.LOSS_GAIN_MATRIX)) {
    // Loss/gain: compare current votes with previous_vote_2023
    const gainedRaw = await db
      .select({
        prevParty: anonymousVoteCounts.previous_vote_2023,
        total: sql<number>`SUM(${anonymousVoteCounts.vote_count})`.as('total'),
      })
      .from(anonymousVoteCounts)
      .where(
        and(
          eq(anonymousVoteCounts.round_id, activeRound.id),
          eq(anonymousVoteCounts.party, party.slug),
          eq(anonymousVoteCounts.is_valid, true),
          eq(anonymousVoteCounts.is_dummy, false),
          sql`${anonymousVoteCounts.previous_vote_2023} IS NOT NULL`,
          sql`${anonymousVoteCounts.previous_vote_2023} != ${party.slug}`,
        )
      )
      .groupBy(anonymousVoteCounts.previous_vote_2023);

    const lostRaw = await db
      .select({
        currentParty: anonymousVoteCounts.party,
        total: sql<number>`SUM(${anonymousVoteCounts.vote_count})`.as('total'),
      })
      .from(anonymousVoteCounts)
      .where(
        and(
          eq(anonymousVoteCounts.round_id, activeRound.id),
          eq(anonymousVoteCounts.previous_vote_2023, party.slug),
          eq(anonymousVoteCounts.is_valid, true),
          eq(anonymousVoteCounts.is_dummy, false),
          sql`${anonymousVoteCounts.party} != ${party.slug}`,
        )
      )
      .groupBy(anonymousVoteCounts.party);

    // Load all party names
    const allParties = await db.select().from(parties).where(eq(parties.is_active, true));
    const partyMap = Object.fromEntries(allParties.map((p) => [p.slug, p.name]));

    const totalGained = gainedRaw.reduce((s, r) => s + Number(r.total), 0);
    const totalLost = lostRaw.reduce((s, r) => s + Number(r.total), 0);

    response.lossGain = {
      partyName: party.name,
      partySlug: party.slug,
      gained: gainedRaw.map((r) => ({
        fromParty: r.prevParty,
        fromPartyName: partyMap[r.prevParty || ''] || r.prevParty,
        toParty: party.slug,
        toPartyName: party.name,
        count: Number(r.total),
        pct: totalGained > 0 ? Number(((Number(r.total) / totalGained) * 100).toFixed(1)) : 0,
      })),
      lost: lostRaw.map((r) => ({
        fromParty: party.slug,
        fromPartyName: party.name,
        toParty: r.currentParty,
        toPartyName: partyMap[r.currentParty] || r.currentParty,
        count: Number(r.total),
        pct: totalLost > 0 ? Number(((Number(r.total) / totalLost) * 100).toFixed(1)) : 0,
      })),
      totalGained,
      totalLost,
      netChange: totalGained - totalLost,
    };
  }

  if (include === 'projection' && partyContextHasFeature(ctx, FEATURES.SEAT_PROJECTION)) {
    // D'Hondt seat projection
    const totalSeats = 600;
    const barajPct = 7;

    // Only parties above threshold
    const eligibleParties = sorted.filter((r) => {
      const pct = grandTotal > 0 ? (Number(r.total) / grandTotal) * 100 : 0;
      return pct >= barajPct;
    });

    const eligibleTotal = eligibleParties.reduce((s, r) => s + Number(r.total), 0);

    // D'Hondt allocation
    const seatAllocation: Record<string, number> = {};
    eligibleParties.forEach((p) => { seatAllocation[p.party] = 0; });

    for (let seat = 0; seat < totalSeats; seat++) {
      let maxQuotient = -1;
      let winner = '';
      for (const p of eligibleParties) {
        const quotient = Number(p.total) / (seatAllocation[p.party] + 1);
        if (quotient > maxQuotient) {
          maxQuotient = quotient;
          winner = p.party;
        }
      }
      if (winner) seatAllocation[winner]++;
    }

    const allParties = await db.select().from(parties).where(eq(parties.is_active, true));
    const partyMap = Object.fromEntries(allParties.map((p) => [p.slug, p]));

    const projections = sorted.map((r) => {
      const p = partyMap[r.party];
      const pct = grandTotal > 0 ? (Number(r.total) / grandTotal) * 100 : 0;
      return {
        partySlug: r.party,
        partyName: p?.name || r.party,
        shortName: p?.short_name || r.party,
        pollPct: Number(pct.toFixed(1)),
        projectedSeats: seatAllocation[r.party] || 0,
        change: 0,
      };
    });

    response.projection = {
      totalSeats,
      barajPct,
      projections,
      myParty: projections.find((p) => p.partySlug === party.slug) || null,
    };
  }

  return NextResponse.json(response);
}
