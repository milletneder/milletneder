import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { featureVotes, featureRequests } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// Oy ver: { is_upvote: true/false }
// Ayni yonde tekrar oy = geri al, farkli yon = degistir
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

    const body = await request.json();
    const is_upvote = body.is_upvote === true;

    // Daha once oy vermis mi?
    const [existing] = await db
      .select()
      .from(featureVotes)
      .where(and(eq(featureVotes.user_id, user.id), eq(featureVotes.request_id, requestId)))
      .limit(1);

    if (existing) {
      if (existing.is_upvote === is_upvote) {
        // Ayni yonde tekrar → oyu geri al
        await db.delete(featureVotes).where(eq(featureVotes.id, existing.id));
        await db
          .update(featureRequests)
          .set({ vote_count: sql`${featureRequests.vote_count} + ${is_upvote ? -1 : 1}` })
          .where(eq(featureRequests.id, requestId));

        return NextResponse.json({ user_vote: null });
      } else {
        // Farkli yon → degistir
        await db
          .update(featureVotes)
          .set({ is_upvote })
          .where(eq(featureVotes.id, existing.id));
        // +2 veya -2 (birini kaldir digerini ekle)
        await db
          .update(featureRequests)
          .set({ vote_count: sql`${featureRequests.vote_count} + ${is_upvote ? 2 : -2}` })
          .where(eq(featureRequests.id, requestId));

        return NextResponse.json({ user_vote: is_upvote ? 'up' : 'down' });
      }
    } else {
      // Yeni oy
      await db
        .insert(featureVotes)
        .values({ request_id: requestId, user_id: user.id, is_upvote });
      await db
        .update(featureRequests)
        .set({ vote_count: sql`${featureRequests.vote_count} + ${is_upvote ? 1 : -1}` })
        .where(eq(featureRequests.id, requestId));

      return NextResponse.json({ user_vote: is_upvote ? 'up' : 'down' });
    }
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
