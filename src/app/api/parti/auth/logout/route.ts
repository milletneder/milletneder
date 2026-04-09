/**
 * POST /api/parti/auth/logout
 *
 * party_token cookie'sini temizler. Istemci tarafi PartyAuthContext
 * ayrica localStorage.party_data'yi temizler.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('party_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
