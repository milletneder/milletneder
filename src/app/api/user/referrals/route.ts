import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
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

    // Get users referred by current user (limited fields only)
    const referredUsers = await db
      .select({
        city: users.city,
        district: users.district,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.referred_by, user.id));

    return NextResponse.json({
      referralCode: user.referral_code,
      referrals: referredUsers,
      totalCount: referredUsers.length,
    });
  } catch (error) {
    console.error("Referrals error:", error);
    return NextResponse.json(
      { error: "Davet bilgileri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
