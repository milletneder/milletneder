import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { referenceDemographics, electionResults2023, cityElectionResults2023, districtElectionResults2023 } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const dimension = request.nextUrl.searchParams.get('dimension');
  const cityFilter = request.nextUrl.searchParams.get('city');

  const demographics = dimension
    ? await db.select().from(referenceDemographics).where(eq(referenceDemographics.dimension, dimension))
    : await db.select().from(referenceDemographics);

  const electionResults = await db.select().from(electionResults2023);

  const cityElectionResults = cityFilter
    ? await db.select().from(cityElectionResults2023).where(eq(cityElectionResults2023.city, cityFilter))
    : await db.select().from(cityElectionResults2023);

  // İlçe bazlı seçim sonuçları
  let districtElectionResults;
  if (cityFilter) {
    districtElectionResults = await db.select().from(districtElectionResults2023)
      .where(eq(districtElectionResults2023.city, cityFilter));
  } else {
    districtElectionResults = await db.select().from(districtElectionResults2023);
  }

  return NextResponse.json({ demographics, electionResults, cityElectionResults, districtElectionResults });
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const body = await request.json();
  const { id, population_share } = body;

  if (!id || population_share === undefined) {
    return NextResponse.json({ error: 'id ve population_share gerekli' }, { status: 400 });
  }

  const share = parseFloat(population_share);
  if (isNaN(share) || share < 0 || share > 1) {
    return NextResponse.json({ error: 'population_share 0-1 arasında olmalı' }, { status: 400 });
  }

  await db
    .update(referenceDemographics)
    .set({ population_share: share.toFixed(6), updated_at: new Date() })
    .where(eq(referenceDemographics.id, parseInt(id)));

  return NextResponse.json({ success: true });
}
