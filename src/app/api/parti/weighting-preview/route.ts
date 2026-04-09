/**
 * POST /api/parti/weighting-preview
 *
 * Runtime weighting override ile sonuclari hesaplar.
 * Admin ayarlarini degistirmez — sadece istemciye onizleme dondurur.
 *
 * Body: { config: Partial<WeightingConfig> }
 * Response: {
 *   default: WeightedResults (cache'ten),
 *   preview: WeightedResults (override uygulanmis),
 *   deltas: [{ party, defaultPct, previewPct, delta }]
 * }
 *
 * Rate limit: IP bazli 20 istek/dakika
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPartyContext, partyContextHasFeature } from '@/lib/auth/party-context';
import { FEATURES } from '@/lib/billing/features';
import { computeWeightedResults } from '@/lib/weighting/engine';
import type { WeightingConfig, WeightedResults } from '@/lib/weighting/types';

export const dynamic = 'force-dynamic';

// Basit in-memory rate limit (IP basina 20 / dakika)
const ipRequests = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    ipRequests.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_REQUESTS;
}

// Cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of ipRequests) {
      if (now - entry.windowStart > WINDOW_MS) ipRequests.delete(ip);
    }
  }, 5 * 60 * 1000);
}

export async function POST(request: NextRequest) {
  const ctx = await getPartyContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  if (!partyContextHasFeature(ctx, FEATURES.PARTY_DASHBOARD)) {
    return NextResponse.json({ error: 'Bu ozellik icin yetkiniz yok' }, { status: 403 });
  }

  // Rate limit
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Cok fazla istek. Lutfen bir dakika sonra tekrar deneyin.' },
      { status: 429 },
    );
  }

  // Body parse
  let body: { config?: Partial<WeightingConfig> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek' }, { status: 400 });
  }

  if (!body.config || typeof body.config !== 'object') {
    return NextResponse.json({ error: 'config objesi gerekli' }, { status: 400 });
  }

  try {
    // Paralel: varsayilan ve override sonuclari
    const [defaultResults, previewResults] = await Promise.all([
      computeWeightedResults(undefined, 'national'),
      computeWeightedResults(undefined, 'preview', body.config, true),
    ]);

    // Parti bazli delta
    const deltaMap = new Map<string, { defaultPct: number; previewPct: number }>();
    for (const p of defaultResults.parties) {
      deltaMap.set(p.party, { defaultPct: p.weightedPct, previewPct: 0 });
    }
    for (const p of previewResults.parties) {
      const entry = deltaMap.get(p.party) || { defaultPct: 0, previewPct: 0 };
      entry.previewPct = p.weightedPct;
      deltaMap.set(p.party, entry);
    }

    const deltas = Array.from(deltaMap.entries())
      .map(([party, { defaultPct, previewPct }]) => ({
        party,
        defaultPct,
        previewPct,
        delta: Math.round((previewPct - defaultPct) * 100) / 100,
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return NextResponse.json({
      default: summarize(defaultResults),
      preview: summarize(previewResults),
      deltas,
    });
  } catch (error) {
    console.error('weighting-preview error:', error);
    return NextResponse.json(
      { error: 'Onizleme hesaplanirken hata olustu' },
      { status: 500 },
    );
  }
}

function summarize(r: WeightedResults) {
  return {
    parties: r.parties,
    confidence: r.confidence,
    methodology: r.methodology,
    sampleSize: r.sampleSize,
    effectiveSampleSize: r.effectiveSampleSize,
  };
}
