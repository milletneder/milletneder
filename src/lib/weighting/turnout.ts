import type { VoteWithDemographics } from './types';

export function computeTurnoutWeights(
  votes: VoteWithDemographics[],
  turnoutWeights: Record<string, number>,
): Map<number, number> {
  const weights = new Map<number, number>();

  for (const vote of votes) {
    const w = vote.turnoutIntention
      ? (turnoutWeights[vote.turnoutIntention] ?? 1)
      : 1;
    weights.set(vote.userId, w);
  }

  return weights;
}
