import type { VoteWithDemographics, ReferenceDist } from './types';

type DimensionExtractor = (v: VoteWithDemographics) => string | null;

const DIMENSION_EXTRACTORS: Record<string, DimensionExtractor> = {
  age: (v) => v.ageBracket,
  gender: (v) => v.gender,
  education: (v) => v.education,
  region: (v) => v.region,
  income: (v) => v.incomeBracket,
};

export function computeRakingWeights(
  votes: VoteWithDemographics[],
  referenceData: Record<string, ReferenceDist[]>,
  dimensions: string[],
  maxIterations: number = 50,
  convergenceThreshold: number = 0.001,
): { weights: Map<number, number>; converged: boolean; iterations: number } {
  const n = votes.length;
  if (n === 0) return { weights: new Map(), converged: true, iterations: 0 };

  // Initialize weights to 1
  const w = new Float64Array(n).fill(1);

  let converged = false;
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    let maxChange = 0;

    for (const dim of dimensions) {
      const extractor = DIMENSION_EXTRACTORS[dim];
      if (!extractor) continue;

      const refDist = referenceData[dim];
      if (!refDist) continue;

      // Build target shares map
      const targetShares = new Map<string, number>();
      for (const r of refDist) {
        targetShares.set(r.category, r.share);
      }

      // Compute current weighted shares for this dimension
      const categoryWeightSums = new Map<string, number>();
      let totalWeight = 0;

      for (let i = 0; i < n; i++) {
        const cat = extractor(votes[i]);
        if (!cat) continue;
        const cur = categoryWeightSums.get(cat) || 0;
        categoryWeightSums.set(cat, cur + w[i]);
        totalWeight += w[i];
      }

      if (totalWeight === 0) continue;

      // Compute adjustment factors
      const adjustments = new Map<string, number>();
      for (const [cat, targetShare] of targetShares) {
        const currentShare = (categoryWeightSums.get(cat) || 0) / totalWeight;
        if (currentShare > 0) {
          const adj = targetShare / currentShare;
          adjustments.set(cat, adj);
          maxChange = Math.max(maxChange, Math.abs(adj - 1));
        }
      }

      // Apply adjustments
      for (let i = 0; i < n; i++) {
        const cat = extractor(votes[i]);
        if (!cat) continue;
        const adj = adjustments.get(cat);
        if (adj !== undefined) {
          w[i] *= adj;
        }
      }
    }

    if (maxChange < convergenceThreshold) {
      converged = true;
      break;
    }
  }

  const weights = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    weights.set(votes[i].userId, w[i]);
  }

  return { weights, converged, iterations };
}
