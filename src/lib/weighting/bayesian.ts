import type { WeightedVote, PartyResult } from './types';

/**
 * Bayesian smoothing for small sample sizes.
 * Blends local results toward national average.
 */
export function applyBayesianSmoothing(
  localResults: PartyResult[],
  nationalResults: PartyResult[],
  localSampleSize: number,
  priorStrength: number,
  minSampleSize: number,
): PartyResult[] {
  // If sample size is large enough, return local results as-is
  if (localSampleSize >= minSampleSize * 3) return localResults;

  const nationalPctMap = new Map<string, number>();
  for (const nr of nationalResults) {
    nationalPctMap.set(nr.party, nr.weightedPct);
  }

  // Blend factor: more smoothing when sample is smaller
  const blendFactor = Math.min(1, priorStrength / (localSampleSize + priorStrength));

  return localResults.map(lr => {
    const nationalPct = nationalPctMap.get(lr.party) ?? 0;
    const smoothedPct = lr.weightedPct * (1 - blendFactor) + nationalPct * blendFactor;
    const smoothedCount = lr.weightedCount * (1 - blendFactor) + (nationalPct / 100 * localSampleSize) * blendFactor;

    return {
      ...lr,
      weightedPct: smoothedPct,
      weightedCount: smoothedCount,
      delta: smoothedPct - lr.rawPct,
    };
  });
}

/**
 * Group votes by a key (city, region) and return sample sizes.
 */
export function getGroupSampleSizes(
  votes: WeightedVote[],
  groupBy: (v: WeightedVote) => string,
): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const v of votes) {
    const key = groupBy(v);
    sizes.set(key, (sizes.get(key) || 0) + 1);
  }
  return sizes;
}
