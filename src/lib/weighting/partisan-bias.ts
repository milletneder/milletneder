import type { VoteWithDemographics } from './types';

interface ElectionResult {
  partySlug: string;
  voteShare: number;
}

/**
 * Partizan sapma düzeltmesi.
 *
 * Kullanıcıların beyan ettiği 2023 oyları ile YSK gerçek sonuçlarını
 * karşılaştırır. Fazla temsil edilen partilerin ağırlığını düşürür,
 * az temsil edilenleri artırır.
 *
 * Yumuşatma (damping) uygulanır: ham düzeltme çarpanı 1'e doğru
 * çekilir ki aşırı kaymalar önlensin. damping=0.5 ile 1.8x düzeltme
 * → 1.4x olur, 0.6x → 0.8x olur.
 */
export function computePartisanBiasWeights(
  votes: VoteWithDemographics[],
  electionResults2023: ElectionResult[],
): Map<number, number> {
  const weights = new Map<number, number>();
  const DAMPING = 0.7; // 0 = düzeltme yok, 1 = tam düzeltme (0.5→0.7: X/Twitter kaynaklı partizan sapmayı daha güçlü düzelt)

  // Count sample's 2023 vote distribution
  const sampleCounts = new Map<string, number>();
  let totalWithPrevVote = 0;

  for (const v of votes) {
    if (v.previousVote2023 && v.previousVote2023 !== 'yok') {
      sampleCounts.set(v.previousVote2023, (sampleCounts.get(v.previousVote2023) || 0) + 1);
      totalWithPrevVote++;
    }
  }

  if (totalWithPrevVote === 0) {
    for (const v of votes) weights.set(v.userId, 1);
    return weights;
  }

  // Build YSK share lookup
  const yskShares = new Map<string, number>();
  for (const result of electionResults2023) {
    yskShares.set(result.partySlug, result.voteShare);
  }

  // Compute dampened correction factors
  const correctionFactors = new Map<string, number>();
  for (const [party, count] of sampleCounts) {
    const sampleShare = count / totalWithPrevVote;
    const yskShare = yskShares.get(party);

    if (yskShare && sampleShare > 0) {
      const rawCorrection = yskShare / sampleShare;
      // Dampen: 1 + damping * (raw - 1)
      const dampened = 1 + DAMPING * (rawCorrection - 1);
      correctionFactors.set(party, dampened);
    }
    // YSK'da karşılığı olmayan partiler (diger, saadet vb.) → 1.0 (nötr)
  }

  for (const v of votes) {
    if (v.previousVote2023 && v.previousVote2023 !== 'yok') {
      const factor = correctionFactors.get(v.previousVote2023) ?? 1;
      weights.set(v.userId, factor);
    } else {
      weights.set(v.userId, 1);
    }
  }

  return weights;
}
