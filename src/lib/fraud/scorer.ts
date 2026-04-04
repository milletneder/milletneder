import { db } from '@/lib/db';
import { users, deviceLogs, fraudScores } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { isDisposableEmail } from './disposable-emails';
import { isVpnOrDatacenter, getSubnetGroup } from './vpn-detection';
import type { FraudFactors, FraudScoringConfig } from './types';
import { DEFAULT_FRAUD_CONFIG } from './types';

const SUSPICIOUS_UA_PATTERNS = [
  /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
  /playwright/i, /webdriver/i, /bot/i, /crawl/i, /spider/i,
  /curl/i, /wget/i, /python-requests/i, /httpie/i,
];

export async function computeFraudScore(
  userId: number,
  config: FraudScoringConfig = DEFAULT_FRAUD_CONFIG,
): Promise<{ score: number; factors: FraudFactors; isVpn: boolean; subnetGroup: string | null }> {
  const factors: FraudFactors = {
    ipSubnet: 0,
    vpn: 0,
    youngAccount: 0,
    disposableEmail: 0,
    sequentialEmail: 0,
    emptyProfile: 0,
    suspiciousUa: 0,
  };

  // Fetch user data
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { score: 0, factors, isVpn: false, subnetGroup: null };

  // Fetch device logs
  const logs = await db
    .select()
    .from(deviceLogs)
    .where(eq(deviceLogs.user_id, userId));

  const latestLog = logs[0];
  const ip = latestLog?.ip_address || '';
  const ua = latestLog?.user_agent || '';
  const subnetGroup = getSubnetGroup(ip);

  // 1. IP Subnet analysis
  if (subnetGroup) {
    const subnetResult = await db.execute(
      sql`SELECT COUNT(DISTINCT user_id)::int as cnt
          FROM device_logs
          WHERE ip_address LIKE ${subnetGroup.replace('.0/24', '.%')}`
    );
    const subnetUsers = (subnetResult.rows[0] as { cnt: number })?.cnt || 0;

    if (subnetUsers >= 10) {
      factors.ipSubnet = config.ipSubnetMaxScore;
    } else if (subnetUsers >= 5) {
      factors.ipSubnet = Math.round(config.ipSubnetMaxScore * 0.8);
    } else if (subnetUsers >= config.ipSubnetThreshold) {
      factors.ipSubnet = Math.round(config.ipSubnetMaxScore * 0.4);
    }
  }

  // 2. VPN/Datacenter detection
  const isVpn = isVpnOrDatacenter(ip);
  if (isVpn) {
    factors.vpn = config.vpnScore;
  }

  // 3. Young account
  const accountAgeHours = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60);
  if (accountAgeHours < config.youngAccountHours) {
    factors.youngAccount = config.youngAccountScore;
  }

  // 4. Disposable email — skipped (no email stored in DB, Firebase handles auth)

  // 5. Empty profile (no demographic data)
  if (!user.gender && !user.age_bracket && !user.education) {
    factors.emptyProfile = config.emptyProfileScore;
  }

  // 6. Suspicious user agent
  if (ua && SUSPICIOUS_UA_PATTERNS.some(p => p.test(ua))) {
    factors.suspiciousUa = config.suspiciousUaScore;
  }

  // Total score (capped at 100)
  const score = Math.min(100,
    factors.ipSubnet + factors.vpn + factors.youngAccount +
    factors.disposableEmail + factors.sequentialEmail +
    factors.emptyProfile + factors.suspiciousUa
  );

  return { score, factors, isVpn, subnetGroup };
}

export async function saveFraudScore(
  userId: number,
  score: number,
  factors: FraudFactors,
  isVpn: boolean,
  subnetGroup: string | null,
): Promise<void> {
  await db
    .insert(fraudScores)
    .values({
      user_id: userId,
      score: score.toFixed(2),
      factors: factors as unknown as Record<string, unknown>,
      is_vpn: isVpn,
      subnet_group: subnetGroup,
      last_calculated: new Date(),
    })
    .onConflictDoUpdate({
      target: [fraudScores.user_id],
      set: {
        score: score.toFixed(2),
        factors: factors as unknown as Record<string, unknown>,
        is_vpn: isVpn,
        subnet_group: subnetGroup,
        last_calculated: new Date(),
        updated_at: new Date(),
      },
    });
}

export async function computeAndSaveFraudScore(
  userId: number,
  config?: FraudScoringConfig,
): Promise<number> {
  const { score, factors, isVpn, subnetGroup } = await computeFraudScore(userId, config);
  await saveFraudScore(userId, score, factors, isVpn, subnetGroup);
  return score;
}
