import type { VoteWithDemographics } from './types';

export function computeRecencyWeights(
  votes: VoteWithDemographics[],
  lambda: number,
  referenceDate?: Date,
): Map<number, number> {
  const ref = referenceDate || new Date();
  const weights = new Map<number, number>();

  for (const vote of votes) {
    const daysSince = (ref.getTime() - vote.voteDate.getTime()) / (1000 * 60 * 60 * 24);
    const w = Math.exp(-lambda * Math.max(0, daysSince));
    weights.set(vote.userId, w);
  }

  return weights;
}
