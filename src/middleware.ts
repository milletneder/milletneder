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
  // fetch() tarayıcı Basic Auth credential'ını otomatik göndermez
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Staging — Basic Auth kontrol
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Basic ')) {
    const providedB64 = authHeader.slice(6);
    if (providedB64 === STAGING_CREDENTIALS_B64) {
      return NextResponse.next();
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
