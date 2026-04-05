import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { featureRequests, featureVotes, users } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// Onerileri listele
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const sort = request.nextUrl.searchParams.get('sort') || 'votes';

    const orderBy = sort === 'new' ? desc(featureRequests.created_at) : desc(featureRequests.vote_count);

    const rows = await db
      .select({
        id: featureRequests.id,
        title: featureRequests.title,
        description: featureRequests.description,
        vote_count: featureRequests.vote_count,
        comment_count: featureRequests.comment_count,
        is_open: featureRequests.is_open,
        created_at: featureRequests.created_at,
        author_anon_uid: users.anon_uid,
        author_city: users.city,
      })
      .from(featureRequests)
      .leftJoin(users, eq(featureRequests.user_id, users.id))
      .orderBy(orderBy);

    // Kullanicinin oylari
    let userVoteMap: Record<number, 'up' | 'down'> = {};
    if (user) {
      const voted = await db
        .select({ request_id: featureVotes.request_id, is_upvote: featureVotes.is_upvote })
        .from(featureVotes)
        .where(eq(featureVotes.user_id, user.id));
      for (const v of voted) {
        userVoteMap[v.request_id] = v.is_upvote ? 'up' : 'down';
      }
    }

    const items = rows.map((r) => ({
      ...r,
      user_vote: userVoteMap[r.id] || null,
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Yeni oneri olustur
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }

    const body = await request.json();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();

    if (!title || title.length < 3 || title.length > 200) {
      return NextResponse.json({ error: 'Başlık 3-200 karakter olmalı' }, { status: 400 });
    }
    if (!description || description.length < 10 || description.length > 2000) {
      return NextResponse.json({ error: 'Açıklama 10-2000 karakter olmalı' }, { status: 400 });
    }

    const [item] = await db
      .insert(featureRequests)
      .values({ user_id: user.id, title, description })
      .returning();

    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
