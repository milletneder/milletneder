import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware — Staging ortamı için Basic Auth koruması.
 *
 * nginx'in auth_basic modülü, Next.js'in dahili fetch çağrıları (RSC,
 * client-side navigation) ile uyumsuz çalışır çünkü tarayıcılar
 * programatik fetch'lerde Basic Auth bilgilerini göndermeyebilir.
 *
 * Bu middleware, Basic Auth'u uygulama seviyesinde halleder ve
 * tüm istek tipleri için tutarlı çalışır.
 *
 * Aktif olması için: STAGING_BASIC_AUTH=user:password env var gerekir.
 */
export function middleware(request: NextRequest) {
  const credentials = process.env.STAGING_BASIC_AUTH;

  // Env var yoksa Basic Auth uygulanmaz (production'da devre dışı)
  if (!credentials) {
    return NextResponse.next();
  }

  // Static dosyalar ve favicon için Basic Auth gerekmesin
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Basic ')) {
    try {
      const decoded = atob(authHeader.slice(6));
      if (decoded === credentials) {
        return NextResponse.next();
      }
    } catch {
      // decode hatası — devam et, 401 dönecek
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
    /*
     * Tüm path'lere uygula, SADECE şunlar hariç:
     * - _next/static (static dosyalar)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
};
