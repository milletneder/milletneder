import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publishedReports } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Increment view_count and return the report
    const result = await db
      .update(publishedReports)
      .set({ view_count: sql`COALESCE(${publishedReports.view_count}, 0) + 1` })
      .where(eq(publishedReports.slug, slug))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Rapor bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ report: result[0] });
  } catch (error) {
    console.error('Report detail error:', error);
    return NextResponse.json({ error: 'Rapor yüklenemedi' }, { status: 500 });
  }
}
