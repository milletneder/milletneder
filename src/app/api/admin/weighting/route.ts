import { NextRequest, NextResponse } from 'next/server';
import { eq, isNull, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { weightingConfigs } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { invalidateCache } from '@/lib/weighting/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const roundId = request.nextUrl.searchParams.get('round_id');

  const allConfigs = await db
    .select()
    .from(weightingConfigs)
    .where(roundId ? eq(weightingConfigs.round_id, parseInt(roundId)) : isNull(weightingConfigs.round_id));

  // Mükerrer config_key'leri önle — en güncel kaydı al
  const configMap = new Map<string, typeof allConfigs[0]>();
  for (const c of allConfigs) {
    const existing = configMap.get(c.config_key);
    if (!existing || c.updated_at > existing.updated_at) {
      configMap.set(c.config_key, c);
    }
  }
  const configs = Array.from(configMap.values());

  return NextResponse.json({ configs });
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const body = await request.json();
  const { config_key, round_id, is_enabled, parameters } = body;

  if (!config_key) {
    return NextResponse.json({ error: 'config_key gerekli' }, { status: 400 });
  }

  const VALID_KEYS = [
    'post_stratification', 'raking', 'turnout', 'recency',
    'bayesian', 'partisan_bias', 'regional_quota', 'fraud_detection', 'weight_cap',
  ];

  if (!VALID_KEYS.includes(config_key)) {
    return NextResponse.json({ error: 'Geçersiz config_key' }, { status: 400 });
  }

  const roundIdValue = round_id ? parseInt(round_id) : null;

  // NULL round_id ile UNIQUE constraint çalışmadığı için upsert elle yapılır
  const existing = await db
    .select()
    .from(weightingConfigs)
    .where(
      roundIdValue
        ? and(eq(weightingConfigs.round_id, roundIdValue), eq(weightingConfigs.config_key, config_key))
        : and(isNull(weightingConfigs.round_id), eq(weightingConfigs.config_key, config_key))
    );

  if (existing.length > 0) {
    await db
      .update(weightingConfigs)
      .set({
        is_enabled: is_enabled ?? false,
        parameters: parameters ?? {},
        updated_by: admin.id,
        updated_at: new Date(),
      })
      .where(eq(weightingConfigs.id, existing[0].id));
  } else {
    await db.insert(weightingConfigs).values({
      round_id: roundIdValue,
      config_key,
      is_enabled: is_enabled ?? false,
      parameters: parameters ?? {},
      updated_by: admin.id,
    });
  }

  // Invalidate cache
  if (roundIdValue) {
    await invalidateCache(roundIdValue);
  } else {
    await invalidateCache();
  }

  return NextResponse.json({ success: true });
}
