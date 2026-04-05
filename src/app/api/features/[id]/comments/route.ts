import { NextRequest, NextResponse } from 'next/server';
import { eq, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { featureComments, featureRequests, users } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// Yorumlari listele
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 });
    }

    const comments = await db
      .select({
        id: featureComments.id,
        content: featureComments.content,
        created_at: featureComments.created_at,
        author_anon_uid: users.anon_uid,
        author_city: users.city,
      })
      .from(featureComments)
      .leftJoin(users, eq(featureComments.user_id, users.id))
      .where(eq(featureComments.request_id, requestId))
      .orderBy(asc(featureComments.created_at));

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Yorum ekle
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
    const content = String(body.content || '').trim();

    if (!content || content.length < 2 || content.length > 1000) {
      return NextResponse.json({ error: 'Yorum 2-1000 karakter olmalı' }, { status: 400 });
    }

    const [comment] = await db
      .insert(featureComments)
      .values({ request_id: requestId, user_id: user.id, content })
      .returning();

    // Yorum sayisini guncelle
    await db
      .update(featureRequests)
      .set({ comment_count: sql`${featureRequests.comment_count} + 1` })
      .where(eq(featureRequests.id, requestId));

    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
