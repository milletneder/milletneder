import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { parties } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activeParties = await db
      .select()
      .from(parties)
      .where(eq(parties.is_active, true))
      .orderBy(asc(parties.sort_order));

    return NextResponse.json({ parties: activeParties });
  } catch (error) {
    console.error('Public parties list error:', error);
    return NextResponse.json(
      { error: 'Partiler listelenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
