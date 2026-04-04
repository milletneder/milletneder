import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { votes, rounds, parties as partiesTable } from "@/lib/db/schema";
import { getUserFromRequest } from "@/lib/auth/middleware";
import { verifyToken } from "@/lib/auth/jwt";
import { decryptParty } from "@/lib/crypto/vote-encryption";

export const dynamic = 'force-dynamic';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    // VEK al (JWT'den) — encrypted party'leri decrypt etmek icin
    let vek: Buffer | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const jwtPayload = verifyToken(authHeader.slice(7));
        if (jwtPayload.vk) vek = Buffer.from(jwtPayload.vk, 'base64');
      } catch { /* ignore */ }
    }

    const rows = await db
      .select({
        roundId: rounds.id,
        startDate: rounds.start_date,
        endDate: rounds.end_date,
        party: votes.party,
        encryptedParty: votes.encrypted_party,
        changeCount: votes.change_count,
        isValid: votes.is_valid,
        isPublished: rounds.is_published,
      })
      .from(votes)
      .innerJoin(rounds, eq(votes.round_id, rounds.id))
      .where(eq(votes.user_id, user.id))
      .orderBy(desc(rounds.start_date));

    // DB'den parti kısa adları ve renkleri
    const dbParties = await db.select().from(partiesTable);
    const slugToShort: Record<string, string> = {};
    const slugToColor: Record<string, string> = {};
    for (const p of dbParties) {
      slugToShort[p.slug] = p.short_name;
      slugToColor[p.slug] = p.color;
    }

    const history = rows.map((row) => {
      // party null ise encrypted_party'den decrypt etmeye calis
      let resolvedParty = row.party;
      if (!resolvedParty && row.encryptedParty && vek) {
        resolvedParty = decryptParty(row.encryptedParty, vek);
      }

      const d = new Date(row.startDate);
      const roundTitle = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      return {
        roundId: row.roundId,
        roundTitle,
        startDate: row.startDate,
        endDate: row.endDate,
        party: (resolvedParty && slugToShort[resolvedParty]) || resolvedParty || '\uD83D\uDD12',
        partySlug: resolvedParty || '',
        partyColor: (resolvedParty && slugToColor[resolvedParty]) || '#555555',
        changeCount: row.changeCount,
        isValid: row.isValid,
        isPublished: row.isPublished,
      };
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Vote history error:", error);
    return NextResponse.json(
      { error: "Oy geçmişi alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
