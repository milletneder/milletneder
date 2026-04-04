import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  // Fingerprint kontrolü devre dışı — false positive oranı çok yüksek
  // Farklı cihazlar aynı fingerprint üretiyor, masum kullanıcılar engelleniyor
  return NextResponse.json({ exists: false });
}
