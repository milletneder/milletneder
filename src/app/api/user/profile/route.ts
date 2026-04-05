import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, votes, voteChanges, deviceLogs, fraudScores, rounds, voteTransactionLog } from "@/lib/db/schema";
import { getUserFromRequest } from "@/lib/auth/middleware";
import { verifyToken } from "@/lib/auth/jwt";
import { MAX_VOTE_CHANGES, VALID_AGE_BRACKETS, VALID_INCOME_BRACKETS, VALID_GENDERS, VALID_EDUCATION_BRACKETS, VALID_TURNOUT_OPTIONS } from "@/lib/constants";

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

    // Get referral stats
    const [referralCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.referred_by, user.id));

    // Get remaining vote changes for active round
    let remainingVoteChanges = MAX_VOTE_CHANGES;

    const [activeRound] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.is_active, true))
      .limit(1);

    if (activeRound) {
      const [currentVote] = await db
        .select({ change_count: votes.change_count })
        .from(votes)
        .where(
          and(
            eq(votes.user_id, user.id),
            eq(votes.round_id, activeRound.id)
          )
        )
        .limit(1);

      if (currentVote) {
        remainingVoteChanges = MAX_VOTE_CHANGES - currentVote.change_count;
      }
    }

    // Parse badges
    let badges: string[] = [];
    try {
      badges = JSON.parse(user.badges);
    } catch {
      badges = [];
    }

    // Hassas alanları client'a gönderme
    const { recovery_codes: _rc, encrypted_vek: _ev, ...safeUser } = user;

    return NextResponse.json({
      user: {
        ...safeUser,
        badges,
      },
      referralCount: referralCount?.count ?? 0,
      remainingVoteChanges,
      activeRoundId: activeRound?.id ?? null,
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { error: "Profil bilgileri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, string | null> = {};

    if (body.age_bracket !== undefined) {
      if (body.age_bracket !== null && !VALID_AGE_BRACKETS.includes(body.age_bracket)) {
        return NextResponse.json(
          { error: "Geçersiz yaş aralığı" },
          { status: 400 }
        );
      }
      updateData.age_bracket = body.age_bracket;
    }

    if (body.income_bracket !== undefined) {
      if (body.income_bracket !== null && !VALID_INCOME_BRACKETS.includes(body.income_bracket)) {
        return NextResponse.json(
          { error: "Geçersiz gelir aralığı" },
          { status: 400 }
        );
      }
      updateData.income_bracket = body.income_bracket;
    }

    if (body.city !== undefined) {
      // Şehir validasyonu — CITY_POPULATIONS listesinde olmalı
      const { CITY_POPULATIONS } = await import("@/lib/city-populations");
      if (body.city && !CITY_POPULATIONS[body.city]) {
        return NextResponse.json(
          { error: "Geçersiz şehir" },
          { status: 400 }
        );
      }
      updateData.city = body.city;
    }

    if (body.district !== undefined) {
      updateData.district = body.district;
    }

    if (body.gender !== undefined) {
      if (body.gender !== null && !VALID_GENDERS.includes(body.gender)) {
        return NextResponse.json({ error: "Geçersiz cinsiyet" }, { status: 400 });
      }
      updateData.gender = body.gender;
    }

    if (body.education !== undefined) {
      if (body.education !== null && !VALID_EDUCATION_BRACKETS.includes(body.education)) {
        return NextResponse.json({ error: "Geçersiz eğitim düzeyi" }, { status: 400 });
      }
      updateData.education = body.education;
    }

    if (body.turnout_intention !== undefined) {
      if (body.turnout_intention !== null && !VALID_TURNOUT_OPTIONS.includes(body.turnout_intention)) {
        return NextResponse.json({ error: "Geçersiz katılım niyeti" }, { status: 400 });
      }
      updateData.turnout_intention = body.turnout_intention;
    }

    if (body.previous_vote_2023 !== undefined) {
      // 'yok' özel değeri veya geçerli parti slug'ı kabul edilir
      if (body.previous_vote_2023 !== null && body.previous_vote_2023 !== 'yok') {
        const { parties: partiesTable } = await import("@/lib/db/schema");
        const validParties = await db.select({ slug: partiesTable.slug }).from(partiesTable);
        const validSlugs = validParties.map(p => p.slug);
        if (!validSlugs.includes(body.previous_vote_2023)) {
          return NextResponse.json({ error: "Geçersiz parti seçimi" }, { status: 400 });
        }
      }
      updateData.previous_vote_2023 = body.previous_vote_2023;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek alan bulunamadı" },
        { status: 400 }
      );
    }

    // Demografik değişiklikte anonymous_vote_counts'u güncelle
    const demographicFields = ['age_bracket', 'gender', 'education', 'income_bracket', 'turnout_intention', 'previous_vote_2023', 'city'];
    const hasDemographicChange = demographicFields.some(f => f in updateData);

    if (hasDemographicChange) {
      // JWT'den mevcut parti bilgisini al
      const authHeader = request.headers.get("authorization");
      let currentParty: string | undefined;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const jwtPayload = verifyToken(authHeader.slice(7));
          currentParty = jwtPayload.vp ?? undefined;
        } catch { /* ignore */ }
      }

      // Aktif round'u bul
      const [activeRound] = await db.select().from(rounds).where(eq(rounds.is_active, true)).limit(1);

      if (currentParty && activeRound) {
        // Eski demografiklerle sayaçtan düş
        await db.execute(sql`
          UPDATE anonymous_vote_counts
          SET vote_count = GREATEST(vote_count - 1, 0)
          WHERE round_id = ${activeRound.id} AND party = ${currentParty}
            AND city = ${user.city}
            AND COALESCE(district, '') = COALESCE(${user.district}::text, '')
            AND COALESCE(age_bracket, '') = COALESCE(${user.age_bracket}::text, '')
            AND COALESCE(gender, '') = COALESCE(${user.gender}::text, '')
            AND COALESCE(education, '') = COALESCE(${user.education}::text, '')
            AND COALESCE(income_bracket, '') = COALESCE(${user.income_bracket}::text, '')
            AND COALESCE(turnout_intention, '') = COALESCE(${user.turnout_intention}::text, '')
            AND COALESCE(previous_vote_2023, '') = COALESCE(${user.previous_vote_2023}::text, '')
            AND is_valid = true AND is_dummy = false
        `);

        // Yeni demografiklerle sayaca ekle (güncellenmemiş alanlar user'dan gelir)
        const newCity = updateData.city ?? user.city;
        const newDistrict = updateData.district ?? user.district;
        const newAgeBracket = 'age_bracket' in updateData ? updateData.age_bracket : user.age_bracket;
        const newGender = 'gender' in updateData ? updateData.gender : user.gender;
        const newEducation = 'education' in updateData ? updateData.education : user.education;
        const newIncomeBracket = 'income_bracket' in updateData ? updateData.income_bracket : user.income_bracket;
        const newTurnoutIntention = 'turnout_intention' in updateData ? updateData.turnout_intention : user.turnout_intention;
        const newPreviousVote = 'previous_vote_2023' in updateData ? updateData.previous_vote_2023 : user.previous_vote_2023;

        await db.execute(sql`
          INSERT INTO anonymous_vote_counts (round_id, party, city, district, age_bracket, gender, education, income_bracket, turnout_intention, previous_vote_2023, is_valid, is_dummy, vote_count)
          VALUES (${activeRound.id}, ${currentParty}, ${newCity}, ${newDistrict}, ${newAgeBracket}, ${newGender}, ${newEducation}, ${newIncomeBracket}, ${newTurnoutIntention}, ${newPreviousVote}, true, false, 1)
          ON CONFLICT (round_id, party, city, COALESCE(district,''), COALESCE(age_bracket,''), COALESCE(gender,''), COALESCE(education,''), COALESCE(income_bracket,''), COALESCE(turnout_intention,''), COALESCE(previous_vote_2023,''), is_valid, is_dummy)
          DO UPDATE SET vote_count = anonymous_vote_counts.vote_count + 1
        `);
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set({ ...updateData, updated_at: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Profil güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    // JWT'den şifreli oylar için parti bilgisini al
    let jwtParty: string | undefined;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const jwtPayload = verifyToken(authHeader.slice(7));
        jwtParty = jwtPayload.vp ?? undefined;
      } catch { /* ignore */ }
    }

    // Kullanıcının TÜM oylarını bul — hem açık hem şifreli
    const allUserVotes = await db.execute(sql`
      SELECT id, round_id, party, encrypted_party, city, district, is_valid, is_dummy
      FROM votes WHERE user_id = ${user.id}
      ORDER BY round_id DESC
    `);

    // Her oy için: anonymous_vote_counts düş + OY_SILME transaction log yaz
    for (const row of allUserVotes.rows) {
      const vote = row as {
        id: number; round_id: number; party: string | null; encrypted_party: string | null;
        city: string; district: string | null; is_valid: boolean; is_dummy: boolean;
      };

      // Parti belirle: açık metin varsa onu kullan, şifreli ise JWT'den al
      const voteParty = vote.party || (vote.encrypted_party ? jwtParty : null) || null;

      // anonymous_vote_counts'tan düş (parti biliniyorsa)
      if (voteParty) {
        await db.execute(sql`
          UPDATE anonymous_vote_counts
          SET vote_count = GREATEST(vote_count - 1, 0)
          WHERE round_id = ${vote.round_id}
            AND party = ${voteParty}
            AND city = ${vote.city}
            AND COALESCE(district, '') = COALESCE(${vote.district}, '')
            AND COALESCE(age_bracket, '') = COALESCE(${user.age_bracket}, '')
            AND COALESCE(gender, '') = COALESCE(${user.gender}, '')
            AND COALESCE(education, '') = COALESCE(${user.education}, '')
            AND COALESCE(income_bracket, '') = COALESCE(${user.income_bracket}, '')
            AND COALESCE(turnout_intention, '') = COALESCE(${user.turnout_intention}, '')
            AND COALESCE(previous_vote_2023, '') = COALESCE(${user.previous_vote_2023}, '')
            AND is_valid = ${vote.is_valid}
            AND is_dummy = ${vote.is_dummy}
        `);
      }

      // OY_SILME transaction log
      await db.insert(voteTransactionLog).values({
        tx_type: 'OY_SILME',
        round_id: vote.round_id,
        city: vote.city,
        district: vote.district,
        party: voteParty,
        is_valid: vote.is_valid,
        is_dummy: vote.is_dummy,
      });
    }

    // İlişkili verileri sil (sıra önemli — FK bağımlılıkları)
    await db.delete(voteChanges).where(eq(voteChanges.user_id, user.id));
    await db.delete(votes).where(eq(votes.user_id, user.id));
    await db.delete(deviceLogs).where(eq(deviceLogs.user_id, user.id));
    await db.delete(fraudScores).where(eq(fraudScores.user_id, user.id));
    await db
      .update(users)
      .set({ referred_by: null })
      .where(eq(users.referred_by, user.id));
    await db.delete(users).where(eq(users.id, user.id));

    // HESAP_SILME transaction log
    await db.insert(voteTransactionLog).values({
      tx_type: 'HESAP_SILME',
      round_id: 0,
      city: user.city,
      district: user.district ?? null,
      is_dummy: user.is_dummy,
    });

    return NextResponse.json({ message: "Hesabınız silindi" });
  } catch (error) {
    console.error("Account delete error:", error);
    return NextResponse.json(
      { error: "Hesap silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
