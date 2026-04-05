import { NextRequest, NextResponse } from 'next/server';

// Base64("staging:MnStg2026!")
const STAGING_CREDENTIALS_B64 = 'c3RhZ2luZzpNblN0ZzIwMjYh';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const isStaging = host.includes('staging');

  // Staging değilse geç
  if (!isStaging) {
    return NextResponse.next();
  }

  // API route'ları Basic Auth'dan muaf — kendi auth mekanizmaları var
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Cookie varsa zaten doğrulanmış — geç
  // (fetch/RSC istekleri Basic Auth header göndermez ama cookie gönderir)
  const stagingAuth = request.cookies.get('staging_auth')?.value;
  if (stagingAuth === 'ok') {
    return NextResponse.next();
  }

  // Basic Auth header kontrol
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Basic ')) {
    const providedB64 = authHeader.slice(6);
    if (providedB64 === STAGING_CREDENTIALS_B64) {
      // Cookie set et — sonraki fetch/RSC isteklerinde tekrar sormasın
      const response = NextResponse.next();
      response.cookies.set('staging_auth', 'ok', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 saat
      });
      return response;
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Staging"',
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
};
