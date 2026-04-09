import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { partyAccounts, parties, type PartyAccount, type Party } from '@/lib/db/schema';
import { verifyPartyToken } from './party-jwt';

/**
 * Request'ten parti hesap oturumunu cozer.
 * Token kaynaklari (oncelik sirasina gore):
 *   1) party_token httpOnly cookie (birincil akis)
 *   2) x-party-token header (server-to-server ve test)
 *
 * Basarili olursa { account, party } dondurur. Hesap deaktif ise null.
 */
export async function getPartyAccountFromRequest(
  request: NextRequest,
): Promise<{ account: PartyAccount; party: Party } | null> {
  const token =
    request.cookies.get('party_token')?.value ||
    request.headers.get('x-party-token');

  if (!token) return null;
  const payload = verifyPartyToken(token);
  if (!payload) return null;

  const [account] = await db
    .select()
    .from(partyAccounts)
    .where(eq(partyAccounts.id, payload.accountId))
    .limit(1);

  if (!account || !account.is_active) return null;

  const [party] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, account.party_id))
    .limit(1);

  if (!party) return null;

  return { account, party };
}
