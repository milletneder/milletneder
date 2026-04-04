import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, votes, voteChanges, rounds } from "@/lib/db/schema";
import { getUserFromRequest } from "@/lib/auth/middleware";
import { verifyToken } from "@/lib/auth/jwt";
import { isValidParty } from "@/lib/parties";
import { MAX_VOTE_CHANGES } from "@/lib/constants";
import { encryptParty, decryptParty } from "@/lib/crypto/vote-encryption";

export const dynamic = 'force-dynamic';

// Rate limiting: kullanıcı başına son oy zamanı (bellek tabanlı)
const voteTimestamps = new Map<number, number>();
const VOTE_COOLDOWN_MS = 30_000; // 30 saniye

// Belleği temizle (1 saatte bir)
setInterval(() => {
  const now = Date.now();
  for (const [userId, ts] of voteTimestamps) {
    if (now - ts > 3600_000) voteTimestamps.delete(userId);
  }
}, 3600_000);

export async function POST(request: NextRequest) {
  try {
    // Require auth
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    // Check if flagged
    if (user.is_flagged) {
      return NextResponse.json(
        { error: "Hesabınız güvenlik nedeniyle işaretlenmiştir" },
        { status: 403 }
      );
    }

    // Rate limiting — aynı kullanıcı 30 saniyede birden fazla oy/değişiklik yapamaz
    const lastVoteTime = voteTimestamps.get(user.id);
    if (lastVoteTime && Date.now() - lastVoteTime < VOTE_COOLDOWN_MS) {
      const remaining = Math.ceil((VOTE_COOLDOWN_MS - (Date.now() - lastVoteTime)) / 1000);
      return NextResponse.json(
        { error: `Çok hızlı işlem yapıyorsunuz. ${remaining} saniye sonra tekrar deneyin.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const party = String(body.party || '');
    const roundId = Number(body.roundId);

    if (!party) {
      return NextResponse.json({ error: "Parti seçimi gerekli" }, { status: 400 });
    }
    if (!roundId || isNaN(roundId)) {
      return NextResponse.json({ error: "Geçersiz oylama turu" }, { status: 400 });
    }

    // Validate party
    if (!isValidParty(party)) {
      return NextResponse.json(
        { error: "Geçersiz parti seçimi" },
        { status: 400 }
      );
    }

    // Get active round and verify roundId matches
    const [activeRound] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.is_active, true))
      .limit(1);

    if (!activeRound) {
      return NextResponse.json(
        { error: "Aktif bir oylama turu bulunmuyor" },
        { status: 404 }
      );
    }

    if (activeRound.id !== roundId) {
      return NextResponse.json(
        { error: "Geçersiz oylama turu" },
        { status: 400 }
      );
    }

    // Check if user already voted this round
    const [existingVote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.user_id, user.id), eq(votes.round_id, roundId)))
      .limit(1);

    // VEK al (JWT'den)
    const authHeader = request.headers.get("authorization");
    let vek: Buffer | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const jwtPayload = verifyToken(authHeader.slice(7));
        if (jwtPayload.vk) vek = Buffer.from(jwtPayload.vk, 'base64');
      } catch { /* ignore */ }
    }
    const isEncrypted = user.vote_encryption_version === 1 && vek;

    if (existingVote) {
      // User already voted - check if they can change
      if (existingVote.change_count >= MAX_VOTE_CHANGES) {
        return NextResponse.json(
          {
            error: `Oy değiştirme hakkınız dolmuştur (maksimum ${MAX_VOTE_CHANGES} değişiklik)`,
          },
          { status: 403 }
        );
      }

      // Haftalık cooldown — son değişiklikten 7 gün geçmeli
      if (existingVote.change_count > 0 && existingVote.updated_at) {
        const lastChangeDate = new Date(existingVote.updated_at);
        const daysSinceChange = (Date.now() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceChange < 7) {
          const daysLeft = Math.ceil(7 - daysSinceChange);
          return NextResponse.json(
            { error: `Oy değiştirmek için ${daysLeft} gün daha beklemeniz gerekiyor` },
            { status: 429 }
          );
        }
      }

      // Eski partiyi belirle (encrypted veya plaintext)
      let oldParty: string | null = existingVote.party;
      if (!oldParty && existingVote.encrypted_party && vek) {
        oldParty = decryptParty(existingVote.encrypted_party, vek);
      }

      if (oldParty === party) {
        return NextResponse.json(
          { error: "Zaten bu partiye oy vermişsiniz" },
          { status: 400 }
        );
      }

      // Insert vote change record
      await db.insert(voteChanges).values({
        vote_id: existingVote.id,
        user_id: user.id,
        round_id: roundId,
        old_party: isEncrypted ? null : oldParty,
        new_party: isEncrypted ? null : party,
        encrypted_old_party: vek && oldParty ? encryptParty(oldParty, vek) : null,
        encrypted_new_party: vek ? encryptParty(party, vek) : null,
      });

      // Update the vote
      await db
        .update(votes)
        .set({
          party: isEncrypted ? null : party,
          encrypted_party: vek ? encryptParty(party, vek) : null,
          change_count: existingVote.change_count + 1,
          updated_at: new Date(),
        })
        .where(eq(votes.id, existingVote.id));

      // Write vote change to transaction log (no user_id!)
      await db.execute(sql`
        INSERT INTO vote_transaction_log (tx_type, round_id, city, district, old_party, new_party, is_valid, is_dummy, created_at)
        VALUES ('OY_DEGISIKLIK', ${roundId}, ${user.city}, ${user.district}, ${oldParty}, ${party}, true, false, NOW())
      `);

      // Anonymous vote counts: eski parti -1, yeni parti +1
      if (oldParty) {
        await db.execute(sql`
          UPDATE anonymous_vote_counts
          SET vote_count = GREATEST(vote_count - 1, 0)
          WHERE round_id = ${roundId} AND party = ${oldParty}
            AND city = ${user.city}
            AND COALESCE(age_bracket, '') = COALESCE(${user.age_bracket}::text, '')
            AND COALESCE(gender, '') = COALESCE(${user.gender}::text, '')
            AND COALESCE(education, '') = COALESCE(${user.education}::text, '')
            AND COALESCE(income_bracket, '') = COALESCE(${user.income_bracket}::text, '')
            AND COALESCE(turnout_intention, '') = COALESCE(${user.turnout_intention}::text, '')
            AND COALESCE(previous_vote_2023, '') = COALESCE(${user.previous_vote_2023}::text, '')
            AND is_valid = true AND is_dummy = false
        `);
      }
      await db.execute(sql`
        INSERT INTO anonymous_vote_counts (round_id, party, city, district, age_bracket, gender, education, income_bracket, turnout_intention, previous_vote_2023, is_valid, is_dummy, vote_count)
        VALUES (${roundId}, ${party}, ${user.city}, ${user.district}, ${user.age_bracket}, ${user.gender}, ${user.education}, ${user.income_bracket}, ${user.turnout_intention}, ${user.previous_vote_2023}, true, false, 1)
        ON CONFLICT (round_id, party, city, COALESCE(district,''), COALESCE(age_bracket,''), COALESCE(gender,''), COALESCE(education,''), COALESCE(income_bracket,''), COALESCE(turnout_intention,''), COALESCE(previous_vote_2023,''), is_valid, is_dummy)
        DO UPDATE SET vote_count = anonymous_vote_counts.vote_count + 1
      `);

      voteTimestamps.set(user.id, Date.now());
      return NextResponse.json({
        message: "Oyunuz başarıyla değiştirildi",
        remainingChanges: MAX_VOTE_CHANGES - (existingVote.change_count + 1),
      });
    }

    // Insert new vote
    await db.insert(votes).values({
      user_id: user.id,
      round_id: roundId,
      party: isEncrypted ? null : party,
      encrypted_party: vek ? encryptParty(party, vek) : null,
      city: user.city,
      district: user.district,
      is_valid: true,
    });

    // Write to transaction log (no user_id!)
    await db.execute(sql`
      INSERT INTO vote_transaction_log (tx_type, round_id, city, district, party, is_valid, is_dummy, created_at)
      VALUES ('OY_KULLANIM', ${roundId}, ${user.city}, ${user.district}, ${party}, true, false, NOW())
    `);

    // Anonymous vote counts
    await db.execute(sql`
      INSERT INTO anonymous_vote_counts (round_id, party, city, district, age_bracket, gender, education, income_bracket, turnout_intention, previous_vote_2023, is_valid, is_dummy, vote_count)
      VALUES (${roundId}, ${party}, ${user.city}, ${user.district}, ${user.age_bracket}, ${user.gender}, ${user.education}, ${user.income_bracket}, ${user.turnout_intention}, ${user.previous_vote_2023}, true, false, 1)
      ON CONFLICT (round_id, party, city, COALESCE(district,''), COALESCE(age_bracket,''), COALESCE(gender,''), COALESCE(education,''), COALESCE(income_bracket,''), COALESCE(turnout_intention,''), COALESCE(previous_vote_2023,''), is_valid, is_dummy)
      DO UPDATE SET vote_count = anonymous_vote_counts.vote_count + 1
    `);

    voteTimestamps.set(user.id, Date.now());
    return NextResponse.json(
      {
        message: "Oyunuz başarıyla kaydedildi",
        remainingChanges: MAX_VOTE_CHANGES,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: "Oy kullanılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
