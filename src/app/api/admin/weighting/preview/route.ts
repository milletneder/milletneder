import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { computeWeightedResults } from '@/lib/weighting/engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  try {
    const results = await computeWeightedResults();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Weighting preview error:', error);
    return NextResponse.json({ error: 'Hesaplama hatası' }, { status: 500 });
  }
}
