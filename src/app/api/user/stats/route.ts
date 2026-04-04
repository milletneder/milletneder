import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { votes } from "@/lib/db/schema";
import { getUserFromRequest } from "@/lib/auth/middleware";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const [stats] = await db
      .select({
        totalRoundsParticipated: sql<number>`count(distinct ${votes.round_id})::int`,
        totalVoteChanges: sql<number>`coalesce(sum(${votes.change_count}), 0)::int`,
        firstVoteDate: sql<string | null>`min(${votes.created_at})`,
      })
      .from(votes)
      .where(eq(votes.user_id, user.id));

    const now = new Date();
    const createdAt = new Date(user.created_at);
    const memberSinceDays = Math.max(
      0,
      Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    return NextResponse.json({
      totalRoundsParticipated: stats?.totalRoundsParticipated ?? 0,
      totalVoteChanges: stats?.totalVoteChanges ?? 0,
      firstVoteDate: stats?.firstVoteDate ?? null,
      memberSinceDays,
    });
  } catch (error) {
    console.error("User stats error:", error);
    return NextResponse.json(
      { error: "İstatistikler alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
