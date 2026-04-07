/**
 * Erişim kontrol yardımcıları — API route'larında kullanılır.
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth/middleware';
import type { PlanTier } from './plans';
import { tierAtLeast } from './plans';
import { hasFeature } from './features';

/**
 * Kullanıcının mevcut tier'ını DB'den hızlıca çek.
 */
export async function getUserTier(userId: number): Promise<PlanTier> {
  const [user] = await db
    .select({ subscription_tier: users.subscription_tier })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return (user?.subscription_tier as PlanTier) || 'free';
}

/**
 * Request'ten kullanıcıyı doğrula ve minimum tier kontrol et.
 * Başarısızsa null döner — route 403 dönmeli.
 */
export async function requireTier(
  request: NextRequest,
  minTier: PlanTier
): Promise<{ userId: number; tier: PlanTier } | null> {
  const user = await getUserFromRequest(request);
  if (!user) return null;

  const tier = await getUserTier(user.id);
  if (!tierAtLeast(tier, minTier)) return null;

  return { userId: user.id, tier };
}

/**
 * Request'ten kullanıcıyı doğrula ve belirli feature kontrol et.
 */
export async function requireFeature(
  request: NextRequest,
  feature: string
): Promise<{ userId: number; tier: PlanTier } | null> {
  const user = await getUserFromRequest(request);
  if (!user) return null;

  const tier = await getUserTier(user.id);
  if (!hasFeature(tier, feature)) return null;

  return { userId: user.id, tier };
}
