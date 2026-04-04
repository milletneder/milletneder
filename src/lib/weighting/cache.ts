import { db } from '@/lib/db';
import { weightedResultsCache } from '@/lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import type { WeightedResults } from './types';

export async function getCachedResults(
  roundId: number,
  cacheKey: string,
): Promise<WeightedResults | null> {
  const [cached] = await db
    .select()
    .from(weightedResultsCache)
    .where(
      and(
        eq(weightedResultsCache.round_id, roundId),
        eq(weightedResultsCache.cache_key, cacheKey),
        gt(weightedResultsCache.expires_at, new Date()),
      )
    )
    .limit(1);

  if (!cached) return null;

  return {
    parties: cached.weighted_results as WeightedResults['parties'],
    confidence: cached.confidence as WeightedResults['confidence'],
    methodology: cached.methodology as WeightedResults['methodology'],
    sampleSize: (cached.raw_results as { sampleSize: number })?.sampleSize ?? 0,
    effectiveSampleSize: (cached.raw_results as { effectiveSampleSize: number })?.effectiveSampleSize ?? 0,
  };
}

export async function setCachedResults(
  roundId: number,
  cacheKey: string,
  results: WeightedResults,
  isActiveRound: boolean,
): Promise<void> {
  const ttl = isActiveRound ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttl);

  await db
    .insert(weightedResultsCache)
    .values({
      round_id: roundId,
      cache_key: cacheKey,
      raw_results: { sampleSize: results.sampleSize, effectiveSampleSize: results.effectiveSampleSize },
      weighted_results: results.parties as unknown as Record<string, unknown>,
      confidence: results.confidence as unknown as Record<string, unknown>,
      methodology: results.methodology as unknown as Record<string, unknown>,
      calculated_at: new Date(),
      expires_at: expiresAt,
    })
    .onConflictDoUpdate({
      target: [weightedResultsCache.round_id, weightedResultsCache.cache_key],
      set: {
        raw_results: { sampleSize: results.sampleSize, effectiveSampleSize: results.effectiveSampleSize },
        weighted_results: results.parties as unknown as Record<string, unknown>,
        confidence: results.confidence as unknown as Record<string, unknown>,
        methodology: results.methodology as unknown as Record<string, unknown>,
        calculated_at: new Date(),
        expires_at: expiresAt,
      },
    });
}

export async function invalidateCache(roundId?: number): Promise<void> {
  if (roundId) {
    await db
      .delete(weightedResultsCache)
      .where(eq(weightedResultsCache.round_id, roundId));
  } else {
    await db.delete(weightedResultsCache);
  }
}
