/**
 * GET /api/parti/auth/me
 *
 * PartyAuthContext cookie'yi dogrulamak ve kullanici bilgilerini
 * yeniden yuklemek icin cagirir.
 * NOT: Bu route getPartyContext CAGIRMAZ — direkt middleware'i kullanir.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPartyAccountFromRequest } from '@/lib/auth/party-account-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getPartyAccountFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  return NextResponse.json({
    account: {
      id: session.account.id,
      email: session.account.email,
      last_login_at: session.account.last_login_at,
    },
    party: {
      id: session.party.id,
      slug: session.party.slug,
      name: session.party.name,
      short_name: session.party.short_name,
      color: session.party.color,
      text_color: session.party.text_color,
      logo_url: session.party.logo_url,
    },
  });
}
