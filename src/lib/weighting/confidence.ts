import type { VoteWithDemographics, WeightedVote, ConfidenceScore, ReferenceDist } from './types';
import { CITIES } from '@/lib/constants';

export function computeConfidenceScore(
  votes: VoteWithDemographics[],
  weightedVotes: WeightedVote[],
  referenceData: Record<string, ReferenceDist[]>,
  flaggedCount: number,
): ConfidenceScore {
  const n = votes.length;

  // 1. Sample size factor (0-100)
  // Reaches ~100 at 10,000 votes, ~70 at 1,000
  const sampleSize = Math.min(100, Math.sqrt(n) * 1);

  // 2. Demographic balance (0-100)
  // Compare sample distribution vs reference for each dimension
  const demographicBalance = computeDemographicBalance(votes, referenceData);

  // 3. Geographic coverage (0-100)
  // What percentage of 81 cities have at least 1 vote
  const citiesWithVotes = new Set(votes.map(v => v.city));
  const geographicCoverage = (citiesWithVotes.size / CITIES.length) * 100;

  // 4. Fraud rate (0-100)
  const fraudRate = n > 0 ? Math.max(0, 100 - (flaggedCount / n) * 200) : 100;

  // Overall = weighted average
  const overall = (
    sampleSize * 0.30 +
    demographicBalance * 0.30 +
    geographicCoverage * 0.20 +
    fraudRate * 0.20
  );

  // Margin of error for leading party
  const marginOfError = computeMarginOfError(weightedVotes);

  return {
    overall: Math.round(overall * 10) / 10,
    sampleSize: Math.round(sampleSize * 10) / 10,
    demographicBalance: Math.round(demographicBalance * 10) / 10,
    geographicCoverage: Math.round(geographicCoverage * 10) / 10,
    fraudRate: Math.round(fraudRate * 10) / 10,
    marginOfError: Math.round(marginOfError * 100) / 100,
  };
}

function computeDemographicBalance(
  votes: VoteWithDemographics[],
  referenceData: Record<string, ReferenceDist[]>,
): number {
  const dimensions: Array<{ key: string; extract: (v: VoteWithDemographics) => string | null }> = [
    { key: 'age', extract: v => v.ageBracket },
    { key: 'gender', extract: v => v.gender },
    { key: 'education', extract: v => v.education },
    { key: 'region', extract: v => v.region },
  ];

  let totalDeviation = 0;
  let dimensionCount = 0;

  for (const dim of dimensions) {
    const refDist = referenceData[dim.key];
    if (!refDist || refDist.length === 0) continue;

    // Count sample distribution
    const categoryCounts = new Map<string, number>();
    let total = 0;
    for (const v of votes) {
      const cat = dim.extract(v);
      if (cat) {
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
        total++;
      }
    }

    if (total === 0) continue;

    // Compute chi-squared-like deviation
    let deviation = 0;
    for (const ref of refDist) {
      const sampleShare = (categoryCounts.get(ref.category) || 0) / total;
      deviation += Math.abs(sampleShare - ref.share);
    }

    // Normalize: deviation of 0 = perfect (100), deviation of 1 = worst (0)
    totalDeviation += Math.max(0, 100 - deviation * 100);
    dimensionCount++;
  }

  return dimensionCount > 0 ? totalDeviation / dimensionCount : 50;
}

function computeMarginOfError(weightedVotes: WeightedVote[]): number {
  if (weightedVotes.length === 0) return 0;

  // Compute effective sample size
  const weights = weightedVotes.map(v => v.weight);
  const sumW = weights.reduce((a, b) => a + b, 0);
  const sumW2 = weights.reduce((a, b) => a + b * b, 0);
  const nEff = sumW2 > 0 ? (sumW * sumW) / sumW2 : 0;

  if (nEff <= 1) return 100;

  // Find leading party's proportion
  const partyCounts = new Map<string, number>();
  for (const v of weightedVotes) {
    partyCounts.set(v.party, (partyCounts.get(v.party) || 0) + v.weight);
  }

  let maxShare = 0;
  for (const count of partyCounts.values()) {
    const share = count / sumW;
    if (share > maxShare) maxShare = share;
  }

  // 95% confidence interval: 1.96 * sqrt(p*(1-p)/n_eff)
  return 1.96 * Math.sqrt(maxShare * (1 - maxShare) / nEff) * 100;
}
