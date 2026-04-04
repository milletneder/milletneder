import { NextRequest, NextResponse } from 'next/server';
import { eq, sql, gte, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, votes, rounds, authLogs, deviceLogs } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { getAdminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 403 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      [realUsersResult],
      [dummyUsersResult],
      [validVotesResult],
      [invalidVotesResult],
      [activeRound],
      [todayRegistrationsResult],
      [todayVotesResult],
      [flaggedAccountsResult],
      [todayLoginsResult],
      [uniqueDevicesResult],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.is_dummy, false)),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.is_dummy, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(votes).where(eq(votes.is_valid, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(votes).where(eq(votes.is_valid, false)),
      db.select().from(rounds).where(eq(rounds.is_active, true)).limit(1),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(gte(users.created_at, today), eq(users.is_dummy, false))),
      db.select({ count: sql<number>`count(*)::int` }).from(votes).where(and(gte(votes.created_at, today), eq(votes.is_valid, true))),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.is_flagged, true), eq(users.is_dummy, false))),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(gte(users.last_login_at, today), eq(users.is_dummy, false))),
      db.select({ count: sql<number>`count(DISTINCT fingerprint)::int` }).from(deviceLogs).where(sql`fingerprint IS NOT NULL`),
    ]);

    // 2+ hesap açılan cihaz sayısı
    const multiAccountDevicesResult = await db.execute(sql`
      SELECT count(*)::int as count FROM (
        SELECT fingerprint FROM device_logs dl
        JOIN users u ON dl.user_id = u.id
        WHERE dl.fingerprint IS NOT NULL AND u.is_dummy = false
        GROUP BY fingerprint HAVING count(DISTINCT dl.user_id) >= 2
      ) t
    `);

    // Auth log metrikleri
    const authLogCounts = await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE event_type = 'login' AND created_at >= ${today})::int as today_logins_logged,
        count(*) FILTER (WHERE event_type = 'login_fail' AND created_at >= ${today})::int as today_login_fails,
        count(*) FILTER (WHERE event_type = 'register' AND created_at >= ${today})::int as today_registers,
        count(*) FILTER (WHERE event_type = 'register_incomplete' AND created_at >= ${today})::int as today_incomplete,
        count(*) FILTER (WHERE event_type = 'register_blocked' AND created_at >= ${today})::int as today_blocked,
        count(*) FILTER (WHERE event_type = 'login_fail')::int as total_login_fails,
        count(*) FILTER (WHERE event_type = 'register_incomplete')::int as total_incomplete
      FROM auth_logs
    `);
    const al = authLogCounts.rows[0] as Record<string, number>;

    // Hata dagilimi (bugunki)
    const errorBreakdown = await db.execute(sql`
      SELECT error_code, count(*)::int as count
      FROM auth_logs
      WHERE event_type = 'login_fail' AND created_at >= ${today} AND error_code IS NOT NULL
      GROUP BY error_code ORDER BY count DESC
    `);

    const multiDevices = (multiAccountDevicesResult.rows[0] as { count: number })?.count ?? 0;

    // Firebase toplam kullanıcı sayısı (DB'de olmayan dahil)
    let firebaseUserCount = 0;
    try {
      const adminAuth = getAdminAuth();
      let nextPageToken: string | undefined;
      do {
        const listResult = await adminAuth.listUsers(1000, nextPageToken);
        firebaseUserCount += listResult.users.length;
        nextPageToken = listResult.pageToken;
      } while (nextPageToken);
    } catch (e) {
      console.error('Firebase listUsers error:', e);
    }

    const realUsers = realUsersResult?.count ?? 0;
    const firebaseOnlyUsers = Math.max(0, firebaseUserCount - realUsers);

    return NextResponse.json({
      // Genel
      realUsers,
      dummyUsers: dummyUsersResult?.count ?? 0,
      validVotes: validVotesResult?.count ?? 0,
      invalidVotes: invalidVotesResult?.count ?? 0,
      flaggedAccounts: flaggedAccountsResult?.count ?? 0,
      todayRegistrations: todayRegistrationsResult?.count ?? 0,
      todayVotes: todayVotesResult?.count ?? 0,
      activeRound: activeRound ?? null,
      // Auth & Güvenlik
      todayLogins: todayLoginsResult?.count ?? 0,
      todayLoginFails: al.today_login_fails ?? 0,
      todayIncomplete: al.today_incomplete ?? 0,
      todayBlocked: al.today_blocked ?? 0,
      totalIncomplete: firebaseOnlyUsers, // Firebase'de var ama DB'de yok
      totalLoginFails: al.total_login_fails ?? 0,
      firebaseUserCount,
      // Cihaz
      uniqueDevices: uniqueDevicesResult?.count ?? 0,
      multiAccountDevices: multiDevices,
      // Hata dağılımı
      errorBreakdown: errorBreakdown.rows ?? [],
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Istatistikler alinirken bir hata olustu' },
      { status: 500 }
    );
  }
}
