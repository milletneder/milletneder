/**
 * Parti Dashboard Context Helper
 *
 * Tum /api/parti/* rotalari bunu kullanir. Iki kaynak destekler:
 *   1) Party account session (party_token cookie / x-party-token header)
 *      -> kurumsal parti hesabi, tam erisim
 *   2) Demo token (?demo_token=X query param)
 *      -> admin tarafindan uretilen sureli preview linki, tam erisim
 *
 * NOT: Bireysel user JWT'si (AuthContext) parti rotalarina erismez.
 * Eski subscription_tier='parti' yaklasimi kaldirildi.
 */

import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { demoTokens } from '@/lib/db/schema';
import { getPartyAccountFromRequest } from './party-account-middleware';

export type PartyContext =
  | { kind: 'party'; partyId: number; accountId: number }
  | { kind: 'demo'; partyId: number; token: string };

export async function getPartyContext(request: NextRequest): Promise<PartyContext | null> {
  // 1) Parti hesap session (cookie veya header)
  const session = await getPartyAccountFromRequest(request);
  if (session) {
    return {
      kind: 'party',
      partyId: session.account.party_id,
      accountId: session.account.id,
    };
  }

  // 2) Demo token (query param)
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
 * Gecerli bir parti context (oturum veya demo) her zaman tum parti ozelliklerine
 * erisir. Parametre imza geriye doniklik icin korunur — parti API rotalari hala
 * FEATURES.X sabitlerine referans veriyor.
 */
export function partyContextHasFeature(_ctx: PartyContext, _feature: string): boolean {
  return true;
}
