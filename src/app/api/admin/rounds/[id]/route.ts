import { NextRequest, NextResponse } from 'next/server';
import { eq, sql, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rounds, votes, publishedReports, parties as partiesTable } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { logAdminAction } from '@/lib/admin/audit';
import { computeWeightedResults } from '@/lib/weighting/engine';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const roundId = parseInt(id, 10);
    if (isNaN(roundId)) {
      return NextResponse.json({ error: 'Geçersiz tur ID' }, { status: 400 });
    }

    const [round] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.id, roundId))
      .limit(1);

    if (!round) {
      return NextResponse.json({ error: 'Tur bulunamadı' }, { status: 404 });
    }

    // Vote stats from actual votes table
    const [totalVotesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(votes)
      .where(eq(votes.round_id, roundId));

    const [validVotesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(votes)
      .where(and(eq(votes.round_id, roundId), eq(votes.is_valid, true)));

    const partyDistResult = await db.execute(sql`
      SELECT party, SUM(vote_count)::int as count FROM anonymous_vote_counts
      WHERE round_id = ${roundId} AND is_valid = true AND vote_count > 0
      GROUP BY party ORDER BY count DESC
    `);
    const partyDistribution = partyDistResult.rows as Array<{ party: string | null; count: number }>;

    let totalVotes = totalVotesResult?.count ?? 0;
    let validVotes = validVotesResult?.count ?? 0;
    let invalidVotes = totalVotes - validVotes;
    let finalPartyDistribution = partyDistribution;

    // If no real votes but published report exists, use report_data
    if (totalVotes === 0 && round.is_published) {
      const [report] = await db
        .select()
        .from(publishedReports)
        .where(eq(publishedReports.round_id, roundId))
        .limit(1);

      if (report?.report_data) {
        const data = report.report_data as any;
        const summary = data.summary || data.transparency || {};
        totalVotes = summary.total_votes || 0;
        validVotes = summary.valid_votes || 0;
        invalidVotes = summary.invalid_votes || (totalVotes - validVotes);

        const parties = (data.parties || []) as any[];
        finalPartyDistribution = parties.map((p: any) => ({
          party: p.shortName || p.party,
          count: p.votes || 0,
        }));
      }
    }

    // Parti slug → kısa ad
    const dbParties = await db.select().from(partiesTable);
    const slugToShort: Record<string, string> = {};
    for (const p of dbParties) slugToShort[p.slug] = p.short_name;

    const mappedDistribution = finalPartyDistribution.map((pd: any) => ({
      ...pd,
      party: slugToShort[pd.party] || pd.party,
    }));

    return NextResponse.json({
      round,
      stats: {
        totalVotes,
        validVotes,
        invalidVotes,
        partyDistribution: mappedDistribution,
      },
    });
  } catch (error) {
    console.error('Round detail error:', error);
    return NextResponse.json(
      { error: 'Tur detayları alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const roundId = parseInt(id, 10);
    if (isNaN(roundId)) {
      return NextResponse.json({ error: 'Geçersiz tur ID' }, { status: 400 });
    }

    const [round] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.id, roundId))
      .limit(1);

    if (!round) {
      return NextResponse.json({ error: 'Tur bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const { action, end_date } = body;

    let updateData: Record<string, unknown> = {};
    let auditAction = '';

    switch (action) {
      case 'close':
        updateData = { is_active: false };
        auditAction = 'close_round';
        break;
      case 'extend':
        if (!end_date) {
          return NextResponse.json(
            { error: 'Yeni bitis tarihi gereklidir' },
            { status: 400 }
          );
        }
        updateData = { end_date: new Date(end_date) };
        auditAction = 'extend_round';
        break;
      case 'publish':
        updateData = { is_published: true, published_at: new Date() };
        auditAction = 'publish_round';
        break;
      case 'unpublish':
        updateData = { is_published: false };
        auditAction = 'unpublish_round';
        break;
      default:
        return NextResponse.json(
          { error: 'Geçersiz işlem. İzin verilen işlemler: close, extend, publish, unpublish' },
          { status: 400 }
        );
    }

    const [updatedRound] = await db
      .update(rounds)
      .set(updateData)
      .where(eq(rounds.id, roundId))
      .returning();

    // Publish sırasında ağırlıklı sonuçları report_data'ya ekle/güncelle
    if (action === 'publish') {
      try {
        const weighted = await computeWeightedResults(roundId);
        const weightedSnapshot = {
          parties: weighted.parties,
          confidence: weighted.confidence,
          sampleSize: weighted.sampleSize,
          effectiveSampleSize: weighted.effectiveSampleSize,
          methodology: weighted.methodology,
          published_at: new Date().toISOString(),
        };

        const [existingReport] = await db
          .select()
          .from(publishedReports)
          .where(eq(publishedReports.round_id, roundId))
          .limit(1);

        if (existingReport?.report_data) {
          // Mevcut raporu güncelle
          const reportData = existingReport.report_data as Record<string, unknown>;
          reportData.weighted = weightedSnapshot;
          await db
            .update(publishedReports)
            .set({ report_data: reportData, published_at: new Date() })
            .where(eq(publishedReports.id, existingReport.id));
        } else if (existingReport) {
          // report_data boşsa yeni data oluştur
          await db
            .update(publishedReports)
            .set({ report_data: { weighted: weightedSnapshot }, published_at: new Date() })
            .where(eq(publishedReports.id, existingReport.id));
        }
      } catch (e) {
        console.error('Failed to add weighted results to report:', e);
        // Non-blocking — report is still published without weighted data
      }
    }

    await logAdminAction({
      adminId: admin.id,
      action: auditAction,
      targetType: 'round',
      targetId: roundId,
      details: { action, ...body },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ round: updatedRound });
  } catch (error) {
    console.error('Round update error:', error);
    return NextResponse.json(
      { error: 'Tur güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
