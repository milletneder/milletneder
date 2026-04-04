import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publishedReports } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const reports = await db
      .select({
        id: publishedReports.id,
        slug: publishedReports.slug,
        title: publishedReports.title,
        summary: publishedReports.summary,
        view_count: publishedReports.view_count,
        published_at: publishedReports.published_at,
        report_data: publishedReports.report_data,
      })
      .from(publishedReports)
      .where(eq(publishedReports.is_published, true))
      .orderBy(desc(publishedReports.published_at));

    // Strip heavy report_data, only keep total_votes for the card
    const lightweight = reports.map((r) => {
      const data = r.report_data as Record<string, unknown> | null;
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        view_count: r.view_count,
        published_at: r.published_at,
        total_votes: data?.total_votes ?? null,
      };
    });

    return NextResponse.json({ reports: lightweight });
  } catch (error) {
    console.error('Reports list error:', error);
    return NextResponse.json({ error: 'Raporlar yüklenemedi' }, { status: 500 });
  }
}
