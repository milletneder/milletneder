import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware — Staging ortamı için Basic Auth koruması.
 *
 * Hostname "staging" içeriyorsa Basic Auth uygular.
 * Production'da (milletneder.com) devre dışıdır.
 */

// Base64 encoded credentials — plaintext kodda saklanmaz
// echo -n "staging:MnStg2026!" | base64
const STAGING_CREDENTIALS_B64 = 'c3RhZ2luZzpNblN0ZzIwMjYh';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Sadece staging ortamında Basic Auth uygula
  if (!host.includes('staging')) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Basic ')) {
    // Browser gönderdiği base64 ile karşılaştır
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
