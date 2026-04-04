import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, fraudScores } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { computeAndSaveFraudScore } from '@/lib/fraud/scorer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  // Fraud score distribution
  const distribution = await db.execute(sql`
    SELECT
      CASE
        WHEN score < 20 THEN 'low'
        WHEN score < 50 THEN 'medium'
        WHEN score < 80 THEN 'high'
        ELSE 'critical'
      END as risk_level,
      COUNT(*)::int as count
    FROM fraud_scores
    GROUP BY risk_level
    ORDER BY risk_level
  `);

  // Top risky users
  const topRisky = await db.execute(sql`
    SELECT fs.user_id, fs.score, fs.factors, fs.is_vpn, fs.subnet_group,
           u.identity_hash, u.city, u.is_flagged, u.created_at
    FROM fraud_scores fs
    JOIN users u ON u.id = fs.user_id
    ORDER BY fs.score DESC
    LIMIT 20
  `);

  const totalScored = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM fraud_scores`);

  return NextResponse.json({
    distribution: distribution.rows,
    topRisky: topRisky.rows,
    totalScored: (totalScored.rows[0] as { cnt: number })?.cnt || 0,
  });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  // Bulk recalculate fraud scores for all users
  const allUsers = await db.execute(sql`SELECT id FROM users WHERE is_active = true`);
  const userIds = (allUsers.rows as { id: number }[]).map(r => r.id);

  let processed = 0;
  const batchSize = 50;

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    await Promise.all(batch.map(id => computeAndSaveFraudScore(id)));
    processed += batch.length;
  }

  return NextResponse.json({ success: true, processed });
}
