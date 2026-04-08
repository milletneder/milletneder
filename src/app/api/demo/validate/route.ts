import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  demoTokens,
  parties,
  anonymousVoteCounts,
  rounds,
} from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

/**
 * POST: Demo token dogrulama. Token gecerliyse parti dashboard verilerini dondurur.
 */
export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek' }, { status: 400 });
  }

  const { token } = body;
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token gerekli' }, { status: 400 });
  }

  // Find token
  const [demoToken] = await db
    .select()
    .from(demoTokens)
    .where(eq(demoTokens.token, token))
    .limit(1);

  if (!demoToken) {
    return NextResponse.json({ error: 'Gecersiz demo linki' }, { status: 404 });
  }

  // Check active
  if (!demoToken.is_active) {
    return NextResponse.json({ error: 'Bu demo linki deaktif edilmis' }, { status: 403 });
  }

  // Check expiry
  if (new Date(demoToken.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Bu demo linkinin suresi dolmus' }, { status: 403 });
  }

  // Update access stats
  await db
    .update(demoTokens)
    .set({
      access_count: sql`${demoTokens.access_count} + 1`,
      last_accessed_at: new Date(),
    })
    .where(eq(demoTokens.id, demoToken.id));

  // Get party info
  if (!demoToken.party_id) {
    return NextResponse.json({ error: 'Parti bilgisi bulunamadi' }, { status: 404 });
  }

  const [party] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, demoToken.party_id))
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
  const sorted = [...currentResults].sort((a, b) => Number(b.total) - Number(a.total));

  const myResult = currentResults.find((r) => r.party === party.slug);
  const myVotes = myResult ? Number(myResult.total) : 0;
  const myPct = grandTotal > 0 ? (myVotes / grandTotal) * 100 : 0;
  const myRank = sorted.findIndex((r) => r.party === party.slug) + 1;

  // City count
  const [cityCountRow] = await db
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

  // Trend from published rounds
  const previousRounds = await db
    .select()
    .from(rounds)
    .where(eq(rounds.is_published, true))
    .orderBy(desc(rounds.end_date))
    .limit(5);

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
    const prevPct = prevGrand > 0 ? (Number(prevMyResult?.total || 0) / prevGrand) * 100 : 0;

    trendData.push({
      round: new Date(prevRound.start_date).toLocaleDateString('tr-TR', {
        month: 'short',
        year: 'numeric',
      }),
      pct: Number(prevPct.toFixed(1)),
    });
  }

  // Add current round
  trendData.push({
    round: new Date(activeRound.start_date).toLocaleDateString('tr-TR', {
      month: 'short',
      year: 'numeric',
    }),
    pct: Number(myPct.toFixed(1)),
  });

  let changeFromLastRound = 0;
  if (trendData.length >= 2) {
    changeFromLastRound = trendData[trendData.length - 1].pct - trendData[trendData.length - 2].pct;
  }

  return NextResponse.json({
    party: {
      name: party.name,
      short_name: party.short_name,
      color: party.color,
    },
    currentPollPct: Number(myPct.toFixed(1)),
    rank: myRank || sorted.length + 1,
    totalParties: sorted.length,
    changeFromLastRound: Number(changeFromLastRound.toFixed(1)),
    totalVotes: myVotes,
    cityCount: Number(cityCountRow?.count || 0),
    trendData,
    expiresAt: demoToken.expires_at.toISOString(),
  });
}
