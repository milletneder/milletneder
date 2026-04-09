/**
 * Parti Dashboard Context Helper
 *
 * Hem auth kullanicisini (JWT + subscription) hem demo tokeni (query param)
 * destekler. Tum /api/parti/* rotalari bunu kullanir.
 *
 * - Auth modu: JWT dogrulanir, subscription.party_id okunur, hasFeature kontrol edilir
 * - Demo modu: demo_token query parametresi demo_tokens tablosundan dogrulanir
 *   (expires_at, is_active), party_id dondurulur
 */

import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscriptions, demoTokens } from '@/lib/db/schema';
import { getUserFromRequest } from './middleware';
import { hasFeature, FEATURES } from '@/lib/billing/features';
import type { PlanTier } from '@/lib/billing/plans';

export type PartyContext =
  | { kind: 'auth'; userId: number; partyId: number; tier: PlanTier }
  | { kind: 'demo'; partyId: number; token: string };

/**
 * Request'ten parti context'ini cozer.
 * - Oncelik: Authorization header (JWT)
 * - Fallback: demo_token query parametresi
 *
 * Donus degerleri:
 * - { kind: 'auth', ... } - gecerli auth kullanicisi + parti aboneligi
 * - { kind: 'demo', ... } - gecerli demo token
 * - null - yetkilendirme yok veya gecersiz
 */
export async function getPartyContext(request: NextRequest): Promise<PartyContext | null> {
  // 1) JWT dene
  const user = await getUserFromRequest(request);
  if (user) {
    const tier = (user.subscription_tier || 'free') as PlanTier;
    if (!hasFeature(tier, FEATURES.PARTY_DASHBOARD)) {
      return null;
    }

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, user.id))
      .limit(1);

    if (!sub || !sub.party_id) {
      return null;
    }

    return {
      kind: 'auth',
      userId: user.id,
      partyId: sub.party_id,
      tier,
    };
  }

  // 2) Demo token dene
  const demoToken = request.nextUrl.searchParams.get('demo_token');
  if (!demoToken || typeof demoToken !== 'string' || demoToken.length < 16) {
    return null;
  }

  const [token] = await db
    .select()
    .from(demoTokens)
    .where(eq(demoTokens.token, demoToken))
    .limit(1);

  if (!token) return null;
  if (!token.is_active) return null;
  if (new Date(token.expires_at) < new Date()) return null;
  if (!token.party_id) return null;

  return {
    kind: 'demo',
    partyId: token.party_id,
    token: demoToken,
  };
}

/**
 * Kisa yardimci: belirli bir ozelligin auth modunda gerekli oldugunu dogrular.
 * Demo modunda ozellik kontrolu yapilmaz (demo her seye erisir).
 */
export function partyContextHasFeature(ctx: PartyContext, feature: string): boolean {
  if (ctx.kind === 'demo') return true;
  return hasFeature(ctx.tier, feature);
}
