import type { VoteWithDemographics, ReferenceDist } from './types';

/**
 * Bölgesel kota ağırlıklandırması.
 *
 * Örneklemdeki bölge dağılımını TÜİK seçmen dağılımına yaklaştırır.
 * Yumuşatma (damping) uygulanır: ham düzeltme çarpanı 1'e doğru
 * çekilir ki aşırı kaymalar önlensin.
 */
export function computeRegionalQuotaWeights(
  votes: VoteWithDemographics[],
  regionalTargets: ReferenceDist[],
): Map<number, number> {
  const weights = new Map<number, number>();
  const DAMPING = 0.7; // 0 = düzeltme yok, 1 = tam düzeltme (0.5→0.7: bölgesel dengesizliği daha güçlü düzelt)

  // Count sample distribution by region
  const regionCounts = new Map<string, number>();
  let totalWithRegion = 0;

  for (const v of votes) {
    if (v.region) {
      regionCounts.set(v.region, (regionCounts.get(v.region) || 0) + 1);
      totalWithRegion++;
    }
  }

  if (totalWithRegion === 0) {
    for (const v of votes) weights.set(v.userId, 1);
    return weights;
  }

  // Compute dampened region weights
  const regionWeights = new Map<string, number>();
  for (const target of regionalTargets) {
    const sampleCount = regionCounts.get(target.category) || 0;
    const sampleShare = sampleCount / totalWithRegion;

    if (sampleShare > 0) {
      const rawCorrection = target.share / sampleShare;
      const dampened = 1 + DAMPING * (rawCorrection - 1);
      regionWeights.set(target.category, dampened);
    }
  }

  for (const v of votes) {
    if (v.region) {
      const w = regionWeights.get(v.region) ?? 1;
      weights.set(v.userId, w);
    } else {
      weights.set(v.userId, 1);
    }
  }

  return weights;
}
