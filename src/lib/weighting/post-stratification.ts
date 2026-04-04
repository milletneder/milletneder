import type { VoteWithDemographics, ReferenceDist } from './types';

type DimensionExtractor = (v: VoteWithDemographics) => string | null;

const DIMENSION_EXTRACTORS: Record<string, DimensionExtractor> = {
  age: (v) => v.ageBracket,
  gender: (v) => v.gender,
  education: (v) => v.education,
  region: (v) => v.region,
  income: (v) => v.incomeBracket,
};

export function computePostStratificationWeights(
  votes: VoteWithDemographics[],
  referenceData: Record<string, ReferenceDist[]>,
  dimensions: string[],
): Map<number, number> {
  const weights = new Map<number, number>();

  for (const vote of votes) {
    let combinedWeight = 1;

    for (const dim of dimensions) {
      const extractor = DIMENSION_EXTRACTORS[dim];
      if (!extractor) continue;

      const category = extractor(vote);
      if (!category) continue; // null → weight stays 1 for this dimension

      const refDist = referenceData[dim];
      if (!refDist) continue;

      const refEntry = refDist.find(r => r.category === category);
      if (!refEntry) continue;

      // Count how many votes have this category
      const categoryCount = votes.filter(v => extractor(v) === category).length;
      const sampleShare = categoryCount / votes.length;

      if (sampleShare > 0) {
        combinedWeight *= refEntry.share / sampleShare;
      }
    }

    weights.set(vote.userId, combinedWeight);
  }

  return weights;
}
