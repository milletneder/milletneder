/**
 * POST /api/parti/auth/login
 *
 * Kurumsal parti hesap girisi. Bireysel user login'den tamamen bagimsiz.
 * NOT: Bu route getPartyContext CAGIRMAZ — deadlock onlemi.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { partyAccounts, parties } from '@/lib/db/schema';
import { comparePassword } from '@/lib/auth/password';
import { signPartyToken } from '@/lib/auth/party-jwt';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-posta ve sifre gereklidir' },
        { status: 400 },
      );
    }

    // Account lookup (lowercased)
    const [account] = await db
      .select()
      .from(partyAccounts)
      .where(eq(partyAccounts.email, String(email).toLowerCase().trim()))
      .limit(1);

    if (!account) {
      // Enumeration korumasi: generic mesaj
      return NextResponse.json(
        { error: 'Gecersiz e-posta veya sifre' },
        { status: 403 },
      );
    }

    if (!account.is_active) {
      return NextResponse.json(
        { error: 'Hesabiniz deaktif edilmistir. Yonetici ile iletisime gecin.' },
        { status: 403 },
      );
    }

    const isValid = await comparePassword(password, account.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Gecersiz e-posta veya sifre' },
        { status: 403 },
      );
    }

    // Party info fetch
    const [party] = await db
      .select()
      .from(parties)
      .where(eq(parties.id, account.party_id))
      .limit(1);

    if (!party) {
      return NextResponse.json(
        { error: 'Hesabiniz gecerli bir partiye bagli degil. Yonetici ile iletisime gecin.' },
        { status: 500 },
      );
    }

    // Update last_login_at
    await db
      .update(partyAccounts)
      .set({ last_login_at: new Date(), updated_at: new Date() })
      .where(eq(partyAccounts.id, account.id));

    const token = signPartyToken({
      accountId: account.id,
      partyId: party.id,
      email: account.email,
    });

    const response = NextResponse.json({
      account: {
        id: account.id,
        email: account.email,
        last_login_at: new Date().toISOString(),
      },
      party: {
        id: party.id,
        slug: party.slug,
        name: party.name,
        short_name: party.short_name,
        color: party.color,
        text_color: party.text_color,
        logo_url: party.logo_url,
      },
    });

    // HttpOnly cookie — JS'den erisilmez
    response.cookies.set('party_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 saat
    });

    return response;
  } catch (error) {
    console.error('Party login error:', error);
    return NextResponse.json(
      { error: 'Giris sirasinda bir hata olustu' },
      { status: 500 },
    );
  }
}
