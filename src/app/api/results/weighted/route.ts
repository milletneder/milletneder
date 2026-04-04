import { NextRequest, NextResponse } from 'next/server';
import { computeWeightedResults } from '@/lib/weighting/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get('scope') || 'national';
    const roundId = request.nextUrl.searchParams.get('round_id');

    const cacheKey = scope === 'national'
      ? 'national'
      : `${scope}`;

    const results = await computeWeightedResults(
      roundId ? parseInt(roundId) : undefined,
      cacheKey,
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Weighted results error:', error);
    return NextResponse.json(
      { error: 'Ağırlıklı sonuçlar hesaplanırken hata oluştu' },
      { status: 500 },
    );
  }
}
