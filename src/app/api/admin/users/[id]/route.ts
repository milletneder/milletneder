import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, votes, voteChanges, deviceLogs, fraudScores, parties as partiesTable } from '@/lib/db/schema';
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

    // Firebase hesabı ayrıca silinmez — firebase_uid saklanmadığından eşleştirme mümkün değil.
    // Orphan Firebase hesapları zararsızdır (DB kaydı olmadan sisteme giriş yapılamaz).

    // Kullanıcının son oyunu bul — anonymous_vote_counts'tan düşmek için
    const userVotes = await db.execute(sql`
      SELECT DISTINCT ON (user_id) round_id, party, city, district, is_valid, is_dummy
      FROM votes WHERE user_id = ${userId} AND party IS NOT NULL
      ORDER BY user_id, round_id DESC
    `);
    const lastVote = userVotes.rows[0] as { round_id: number; party: string; city: string; district: string | null; is_valid: boolean; is_dummy: boolean } | undefined;

    // anonymous_vote_counts'tan kullanıcının oyunu düş
    if (lastVote) {
      await db.execute(sql`
        UPDATE anonymous_vote_counts
        SET vote_count = GREATEST(vote_count - 1, 0)
        WHERE round_id = ${lastVote.round_id}
          AND party = ${lastVote.party}
          AND city = ${lastVote.city}
          AND COALESCE(district, '') = COALESCE(${lastVote.district}, '')
          AND COALESCE(age_bracket, '') = COALESCE(${user.age_bracket}, '')
          AND COALESCE(gender, '') = COALESCE(${user.gender}, '')
          AND COALESCE(education, '') = COALESCE(${user.education}, '')
          AND COALESCE(income_bracket, '') = COALESCE(${user.income_bracket}, '')
          AND COALESCE(turnout_intention, '') = COALESCE(${user.turnout_intention}, '')
          AND COALESCE(previous_vote_2023, '') = COALESCE(${user.previous_vote_2023}, '')
          AND is_valid = ${lastVote.is_valid}
          AND is_dummy = ${lastVote.is_dummy}
      `);
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
