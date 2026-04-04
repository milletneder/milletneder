import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cityVoterCounts, districtVoterCounts } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const cityFilter = request.nextUrl.searchParams.get('city');

  const rows = await db.select().from(cityVoterCounts);

  // İlçe bazlı seçmen sayıları
  let districtRows;
  if (cityFilter) {
    districtRows = await db.select().from(districtVoterCounts)
      .where(eq(districtVoterCounts.city, cityFilter));
  } else {
    districtRows = await db.select().from(districtVoterCounts);
  }

  return NextResponse.json({ voterCounts: rows, districtVoterCounts: districtRows });
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const body = await request.json();
  const { id, voter_count, type } = body;

  if (!id || voter_count === undefined) {
    return NextResponse.json({ error: 'id ve voter_count gerekli' }, { status: 400 });
  }

  const count = parseInt(voter_count);
  if (isNaN(count) || count < 0) {
    return NextResponse.json({ error: 'voter_count 0 veya üzeri olmalı' }, { status: 400 });
  }

  if (type === 'district') {
    await db
      .update(districtVoterCounts)
      .set({ voter_count: count, updated_by: admin.id, updated_at: new Date() })
      .where(eq(districtVoterCounts.id, id));
  } else {
    await db
      .update(cityVoterCounts)
      .set({ voter_count: count, updated_by: admin.id, updated_at: new Date() })
      .where(eq(cityVoterCounts.id, id));
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const body = await request.json();
  const { city, voter_count, source, year } = body;

  if (!city || voter_count === undefined) {
    return NextResponse.json({ error: 'city ve voter_count gerekli' }, { status: 400 });
  }

  const count = parseInt(voter_count);
  if (isNaN(count) || count < 0) {
    return NextResponse.json({ error: 'voter_count 0 veya üzeri olmalı' }, { status: 400 });
  }

  await db.insert(cityVoterCounts).values({
    city,
    voter_count: count,
    source: source || 'YSK 2023',
    year: year || 2023,
    updated_by: admin.id,
  });

  return NextResponse.json({ success: true });
}
