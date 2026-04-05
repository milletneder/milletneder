import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { featureVotes, featureRequests } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// Oy ver / geri al (toggle)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }

    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 });
    }

    // Daha once oy vermis mi?
    const [existing] = await db
      .select()
      .from(featureVotes)
      .where(and(eq(featureVotes.user_id, user.id), eq(featureVotes.request_id, requestId)))
      .limit(1);

    if (existing) {
      // Oyu geri al
      await db.delete(featureVotes).where(eq(featureVotes.id, existing.id));
      await db
        .update(featureRequests)
        .set({ vote_count: sql`GREATEST(${featureRequests.vote_count} - 1, 0)` })
        .where(eq(featureRequests.id, requestId));

      return NextResponse.json({ voted: false });
    } else {
      // Oy ver
      await db
        .insert(featureVotes)
        .values({ request_id: requestId, user_id: user.id });
      await db
        .update(featureRequests)
        .set({ vote_count: sql`${featureRequests.vote_count} + 1` })
        .where(eq(featureRequests.id, requestId));

      return NextResponse.json({ voted: true });
    }
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
