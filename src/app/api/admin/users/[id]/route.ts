import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, votes, voteChanges, deviceLogs, fraudScores, parties as partiesTable, voteTransactionLog } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Geçersiz kullanıcı ID' }, { status: 400 });
    }

    const [user] = await db
      .select({
        id: users.id,
        identity_hash: users.identity_hash,
        city: users.city,
        district: users.district,
        auth_provider: users.auth_provider,
        referral_code: users.referral_code,
        referred_by: users.referred_by,
        is_flagged: users.is_flagged,
        is_active: users.is_active,
        badges: users.badges,
        last_login_at: users.last_login_at,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Vote history
    const voteHistory = await db
      .select()
      .from(votes)
      .where(eq(votes.user_id, userId));

    // Device logs
    const devices = await db
      .select()
      .from(deviceLogs)
      .where(eq(deviceLogs.user_id, userId));

    // Referral count
    const [referralResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.referred_by, userId));

    // Parti slug → kısa ad
    const dbParties = await db.select().from(partiesTable);
    const slugToShort: Record<string, string> = {};
    for (const p of dbParties) slugToShort[p.slug] = p.short_name;

    const mappedVotes = voteHistory.map((v) => ({
      ...v,
      party: (v.party && slugToShort[v.party]) || v.party || v.encrypted_party || '—',
    }));

    return NextResponse.json({
      user,
      votes: mappedVotes,
      deviceLogs: devices,
      referralCount: referralResult?.count ?? 0,
    });
  } catch (error) {
    console.error('User detail error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı detayları alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Geçersiz kullanıcı ID' }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const { action, reason } = body;

    let updateData: Record<string, unknown> = {};
    let auditAction = '';

    switch (action) {
      case 'flag':
        updateData = { is_flagged: true, updated_at: new Date() };
        auditAction = 'flag_user';
        break;
      case 'unflag':
        updateData = { is_flagged: false, updated_at: new Date() };
        auditAction = 'unflag_user';
        break;
      case 'deactivate':
        updateData = { is_active: false, updated_at: new Date() };
        auditAction = 'deactivate_user';
        break;
      case 'activate':
        updateData = { is_active: true, updated_at: new Date() };
        auditAction = 'activate_user';
        break;
      default:
        return NextResponse.json(
          { error: 'Geçersiz işlem. İzin verilen işlemler: flag, unflag, deactivate, activate' },
          { status: 400 }
        );
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    await logAdminAction({
      adminId: admin.id,
      action: auditAction,
      targetType: 'user',
      targetId: userId,
      details: { reason: reason ?? null },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ message: 'Kullanıcı başarıyla güncellendi' });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Geçersiz kullanıcı ID' }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Harici auth hesabı yok — tüm doğrulama Twilio + DB üzerinden yapılıyor.

    // Kullanıcının TÜM oylarını bul — hem açık hem şifreli
    const allUserVotes = await db.execute(sql`
      SELECT id, round_id, party, encrypted_party, city, district, is_valid, is_dummy
      FROM votes WHERE user_id = ${userId}
      ORDER BY round_id DESC
    `);

    // Her oy için: anonymous_vote_counts düş + OY_SILME transaction log yaz
    for (const row of allUserVotes.rows) {
      const vote = row as {
        id: number; round_id: number; party: string | null; encrypted_party: string | null;
        city: string; district: string | null; is_valid: boolean; is_dummy: boolean;
      };

      // Parti belirle: açık metin varsa onu kullan (şifreli oylar için parti bilinmez — admin'de JWT yok)
      const voteParty = vote.party || null;

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

    // İlişkili verileri sil (sıra önemli — foreign key bağımlılıkları)
    await db.delete(voteChanges).where(eq(voteChanges.user_id, userId));
    await db.delete(votes).where(eq(votes.user_id, userId));
    await db.delete(deviceLogs).where(eq(deviceLogs.user_id, userId));
    await db.delete(fraudScores).where(eq(fraudScores.user_id, userId));
    await db
      .update(users)
      .set({ referred_by: null })
      .where(eq(users.referred_by, userId));
    await db.delete(users).where(eq(users.id, userId));

    // HESAP_SILME transaction log
    await db.insert(voteTransactionLog).values({
      tx_type: 'HESAP_SILME',
      round_id: 0,
      city: user.city ?? null,
      district: user.district ?? null,
      is_dummy: user.is_dummy,
    });

    // Audit log
    await logAdminAction({
      adminId: admin.id,
      action: 'delete_user',
      targetType: 'user',
      targetId: userId,
      details: { identity_hash: user.identity_hash, city: user.city },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    const message = 'Kullanıcı başarıyla silindi';

    return NextResponse.json({ message });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
