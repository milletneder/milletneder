import { db } from '@/lib/db';
import { votes, users, rounds, weightingConfigs, referenceDemographics, electionResults2023, fraudScores, weightedResultsCache } from '@/lib/db/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';
import { getCityRegion } from '@/lib/geo/regions';
import { computePostStratificationWeights } from './post-stratification';
import { computeRakingWeights } from './raking';
import { computeTurnoutWeights } from './turnout';
import { computeRecencyWeights } from './recency';
import { computePartisanBiasWeights } from './partisan-bias';
import { computeRegionalQuotaWeights } from './regional-quota';
import { computeConfidenceScore } from './confidence';
import { getCachedResults, setCachedResults } from './cache';
import type { VoteWithDemographics, WeightedVote, WeightedResults, WeightingConfig, ReferenceDist, PartyResult } from './types';

/**
 * Bir WeightingConfig'in ustune partial bir override uygular.
 * Sig nested yapiyi korur (raking.enabled, raking.dimensions vs).
 */
function mergeWeightingConfig(base: WeightingConfig, override?: Partial<WeightingConfig>): WeightingConfig {
  if (!override) return base;
  return {
    postStratification: { ...base.postStratification, ...(override.postStratification ?? {}) },
    raking: { ...base.raking, ...(override.raking ?? {}) },
    turnout: { ...base.turnout, ...(override.turnout ?? {}) },
    recency: { ...base.recency, ...(override.recency ?? {}) },
    bayesian: { ...base.bayesian, ...(override.bayesian ?? {}) },
    partisanBias: { ...base.partisanBias, ...(override.partisanBias ?? {}) },
    regionalQuota: { ...base.regionalQuota, ...(override.regionalQuota ?? {}) },
    fraudDetection: { ...base.fraudDetection, ...(override.fraudDetection ?? {}) },
    weightCap: { ...base.weightCap, ...(override.weightCap ?? {}) },
  };
}

async function loadWeightingConfig(roundId?: number): Promise<WeightingConfig> {
  // Load round-specific configs first, fall back to global (round_id IS NULL)
  const configs = await db
    .select()
    .from(weightingConfigs)
    .where(
      roundId
        ? sql`(${weightingConfigs.round_id} = ${roundId} OR ${weightingConfigs.round_id} IS NULL)`
        : isNull(weightingConfigs.round_id)
    );

  // Round-specific overrides global
  const configMap = new Map<string, { is_enabled: boolean; parameters: unknown }>();
  for (const c of configs) {
    if (c.round_id === null && !configMap.has(c.config_key)) {
      configMap.set(c.config_key, { is_enabled: c.is_enabled, parameters: c.parameters });
    }
    if (c.round_id === roundId) {
      configMap.set(c.config_key, { is_enabled: c.is_enabled, parameters: c.parameters });
    }
  }

  const get = (key: string) => configMap.get(key);
  const params = (key: string) => (get(key)?.parameters ?? {}) as Record<string, unknown>;
  const enabled = (key: string) => get(key)?.is_enabled ?? false;

  return {
    postStratification: {
      enabled: enabled('post_stratification'),
      dimensions: (params('post_stratification').dimensions as string[]) ?? ['age', 'gender', 'region'],
    },
    raking: {
      enabled: enabled('raking'),
      dimensions: (params('raking').dimensions as string[]) ?? ['age', 'gender', 'region', 'education'],
      maxIterations: (params('raking').maxIterations as number) ?? 50,
      convergenceThreshold: (params('raking').convergenceThreshold as number) ?? 0.001,
    },
    turnout: {
      enabled: enabled('turnout'),
      weights: (params('turnout').weights as Record<string, number>) ?? { T1: 1, T2: 0.6, T3: 0.3, T4: 0.25 },
    },
    recency: {
      enabled: enabled('recency'),
      lambda: (params('recency').lambda as number) ?? 0.01,
    },
    bayesian: {
      enabled: enabled('bayesian'),
      minSampleSize: (params('bayesian').minSampleSize as number) ?? 30,
      priorStrength: (params('bayesian').priorStrength as number) ?? 10,
    },
    partisanBias: {
      enabled: enabled('partisan_bias'),
    },
    regionalQuota: {
      enabled: enabled('regional_quota'),
    },
    fraudDetection: {
      enabled: enabled('fraud_detection'),
      threshold: (params('fraud_detection').threshold as number) ?? 80,
    },
    weightCap: {
      min: (params('weight_cap').min as number) ?? 0.4,
      max: (params('weight_cap').max as number) ?? 2.5,
    },
  };
}

async function loadReferenceData(): Promise<Record<string, ReferenceDist[]>> {
  const rows = await db.select().from(referenceDemographics);
  const result: Record<string, ReferenceDist[]> = {};

  for (const row of rows) {
    if (!result[row.dimension]) result[row.dimension] = [];
    result[row.dimension].push({
      category: row.category,
      share: parseFloat(row.population_share),
    });
  }

  return result;
}

async function loadFromAnonymousCounts(roundId?: number): Promise<VoteWithDemographics[]> {
  // anonymous_vote_counts tablosundan oku — kullanıcı bağlantısı yok
  const query = roundId
    ? sql`
        SELECT party, city, age_bracket, gender, education, income_bracket,
               turnout_intention, previous_vote_2023, vote_count
        FROM anonymous_vote_counts
        WHERE is_valid = true AND party != 'karasizim'
          AND round_id = ${roundId} AND vote_count > 0
      `
    : sql`
        SELECT party, city, age_bracket, gender, education, income_bracket,
               turnout_intention, previous_vote_2023, SUM(vote_count)::int as vote_count
        FROM anonymous_vote_counts
        WHERE is_valid = true AND party != 'karasizim' AND vote_count > 0
        GROUP BY party, city, age_bracket, gender, education, income_bracket,
                 turnout_intention, previous_vote_2023
      `;

  let result;
  try {
    result = await db.execute(query);
  } catch {
    // Tablo henüz oluşturulmamışsa (migration öncesi) boş dön
    return [];
  }
  const rows = result.rows as Array<{
    party: string; city: string; vote_count: number;
    age_bracket: string | null; gender: string | null; education: string | null;
    income_bracket: string | null; turnout_intention: string | null;
    previous_vote_2023: string | null;
  }>;

  // Her sayaç satırını vote_count kadar sanal oy olarak genişlet
  const votes: VoteWithDemographics[] = [];
  let syntheticId = -1;
  for (const r of rows) {
    for (let i = 0; i < r.vote_count; i++) {
      votes.push({
        userId: syntheticId--,
        party: r.party,
        city: r.city,
        region: getCityRegion(r.city),
        ageBracket: r.age_bracket,
        gender: r.gender,
        education: r.education,
        incomeBracket: r.income_bracket,
        turnoutIntention: r.turnout_intention,
        previousVote2023: r.previous_vote_2023,
        voteDate: new Date(), // recency N/A for anonymous counts
        fraudScore: 0, // fraud filtered at vote time
      });
    }
  }
  return votes;
}

async function loadVotesWithDemographics(roundId?: number): Promise<VoteWithDemographics[]> {
  // Single JOIN query for all valid votes with user demographics
  const query = roundId
    ? sql`
        SELECT v.user_id, v.party, v.city, v.updated_at,
               u.age_bracket, u.gender, u.education, u.income_bracket,
               u.turnout_intention, u.previous_vote_2023,
               COALESCE(fs.score, 0) as fraud_score
        FROM (
          SELECT DISTINCT ON (user_id) user_id, party, city, round_id, updated_at
          FROM votes
          WHERE is_valid = true AND party IS NOT NULL AND round_id = ${roundId} AND party != 'karasizim'
          ORDER BY user_id, round_id DESC
        ) v
        JOIN users u ON u.id = v.user_id
        LEFT JOIN fraud_scores fs ON fs.user_id = v.user_id
      `
    : sql`
        SELECT v.user_id, v.party, v.city, v.updated_at,
               u.age_bracket, u.gender, u.education, u.income_bracket,
               u.turnout_intention, u.previous_vote_2023,
               COALESCE(fs.score, 0) as fraud_score
        FROM (
          SELECT DISTINCT ON (user_id) user_id, party, city, round_id, updated_at
          FROM votes
          WHERE is_valid = true AND party IS NOT NULL AND party != 'karasizim'
          ORDER BY user_id, round_id DESC
        ) v
        JOIN users u ON u.id = v.user_id
        LEFT JOIN fraud_scores fs ON fs.user_id = v.user_id
      `;

  const result = await db.execute(query);
  const rows = result.rows as Array<{
    user_id: number; party: string; city: string; updated_at: Date;
    age_bracket: string | null; gender: string | null; education: string | null;
    income_bracket: string | null; turnout_intention: string | null;
    previous_vote_2023: string | null; fraud_score: string;
  }>;

  return rows.map(r => ({
    userId: r.user_id,
    party: r.party,
    city: r.city,
    region: getCityRegion(r.city),
    ageBracket: r.age_bracket,
    gender: r.gender,
    education: r.education,
    incomeBracket: r.income_bracket,
    turnoutIntention: r.turnout_intention,
    previousVote2023: r.previous_vote_2023,
    voteDate: new Date(r.updated_at),
    fraudScore: parseFloat(r.fraud_score) || 0,
  }));
}

/**
 * Per-user ağırlık haritasını döndürür. Districts API gibi dış tüketiciler için.
 * Engine'in tam pipeline'ını çalıştırır ve Map<userId, weight> döner.
 */
export async function getVoteWeightMap(): Promise<Map<number, number>> {
  const [activeRound] = await db.select().from(rounds).where(eq(rounds.is_active, true)).limit(1);
  const targetRoundId = activeRound?.id;

  if (!targetRoundId) return new Map();

  const [config, referenceData, allVotes] = await Promise.all([
    loadWeightingConfig(targetRoundId),
    loadReferenceData(),
    loadFromAnonymousCounts(targetRoundId),
  ]);

  if (allVotes.length === 0) return new Map();

  return computeWeightMapInternal(config, referenceData, allVotes);
}

async function computeWeightMapInternal(
  config: WeightingConfig,
  referenceData: Record<string, ReferenceDist[]>,
  allVotes: VoteWithDemographics[],
): Promise<Map<number, number>> {
  const wFactors = new Map<number, {
    demographic: number; turnout: number; recency: number;
    fraudPenalty: number; partisanBias: number; regionalQuota: number;
  }>();

  for (const v of allVotes) {
    wFactors.set(v.userId, { demographic: 1, turnout: 1, recency: 1, fraudPenalty: 1, partisanBias: 1, regionalQuota: 1 });
  }

  if (config.raking.enabled) {
    const { weights } = computeRakingWeights(allVotes, referenceData, config.raking.dimensions, config.raking.maxIterations, config.raking.convergenceThreshold);
    for (const [uid, w] of weights) { const f = wFactors.get(uid); if (f) f.demographic = w; }
  } else if (config.postStratification.enabled) {
    const weights = computePostStratificationWeights(allVotes, referenceData, config.postStratification.dimensions);
    for (const [uid, w] of weights) { const f = wFactors.get(uid); if (f) f.demographic = w; }
  }

  if (config.turnout.enabled) {
    const weights = computeTurnoutWeights(allVotes, config.turnout.weights);
    for (const [uid, w] of weights) { const f = wFactors.get(uid); if (f) f.turnout = w; }
  }

  if (config.recency.enabled) {
    const weights = computeRecencyWeights(allVotes, config.recency.lambda);
    for (const [uid, w] of weights) { const f = wFactors.get(uid); if (f) f.recency = w; }
  }

  if (config.partisanBias.enabled) {
    const electionResultsRows = await db.select().from(electionResults2023);
    const results = electionResultsRows.map(r => ({ partySlug: r.party_slug, voteShare: parseFloat(r.vote_share) }));
    const weights = computePartisanBiasWeights(allVotes, results);
    for (const [uid, w] of weights) { const f = wFactors.get(uid); if (f) f.partisanBias = w; }
  }

  if (config.regionalQuota.enabled) {
    const regionRef = referenceData['region'] || [];
    const weights = computeRegionalQuotaWeights(allVotes, regionRef);
    for (const [uid, w] of weights) { const f = wFactors.get(uid); if (f) f.regionalQuota = w; }
  }

  if (config.fraudDetection.enabled) {
    for (const v of allVotes) {
      const f = wFactors.get(v.userId);
      if (f) { f.fraudPenalty = v.fraudScore >= config.fraudDetection.threshold ? 0 : Math.max(0, 1 - v.fraudScore / 100); }
    }
  }

  const weightMap = new Map<number, number>();
  for (const v of allVotes) {
    const f = wFactors.get(v.userId)!;
    let combined = f.demographic * f.turnout * f.recency * f.fraudPenalty * f.partisanBias * f.regionalQuota;
    combined = Math.max(config.weightCap.min, Math.min(config.weightCap.max, combined));
    weightMap.set(v.userId, combined);
  }

  return weightMap;
}

export async function computeWeightedResults(
  roundId?: number,
  cacheKey: string = 'national',
  configOverride?: Partial<WeightingConfig>,
  skipCache?: boolean,
): Promise<WeightedResults> {
  // Find active round if not specified
  let activeRoundId = roundId;
  let isActiveRound = false;

  if (!activeRoundId) {
    const [activeRound] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.is_active, true))
      .limit(1);
    if (activeRound) {
      activeRoundId = activeRound.id;
      isActiveRound = true;
    }
  } else {
    const [round] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.id, activeRoundId))
      .limit(1);
    isActiveRound = round?.is_active ?? false;
  }

  if (!activeRoundId) {
    return emptyResults();
  }

  // Check cache (configOverride varsa veya skipCache true ise cache'i atla)
  const useCache = !configOverride && !skipCache;
  if (useCache) {
    const cached = await getCachedResults(activeRoundId, cacheKey);
    if (cached) return cached;
  }

  // Anonymous vote counts tablosundan oku (kullanıcı bağlantısı yok)
  const [baseConfig, referenceData, allVotes] = await Promise.all([
    loadWeightingConfig(activeRoundId),
    loadReferenceData(),
    loadFromAnonymousCounts(activeRoundId),
  ]);

  // Override uygula
  const config = mergeWeightingConfig(baseConfig, configOverride);

  if (allVotes.length === 0) return emptyResults();

  // Track active methodologies
  const activeMethods: string[] = [];

  // Initialize weight factors
  const weightFactorsMap = new Map<number, {
    demographic: number; turnout: number; recency: number;
    fraudPenalty: number; partisanBias: number; regionalQuota: number;
  }>();

  for (const v of allVotes) {
    weightFactorsMap.set(v.userId, {
      demographic: 1, turnout: 1, recency: 1,
      fraudPenalty: 1, partisanBias: 1, regionalQuota: 1,
    });
  }

  // Apply demographic weighting (raking takes priority over post-strat)
  if (config.raking.enabled) {
    const { weights } = computeRakingWeights(
      allVotes, referenceData, config.raking.dimensions,
      config.raking.maxIterations, config.raking.convergenceThreshold,
    );
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.demographic = w;
    }
    activeMethods.push('raking');
  } else if (config.postStratification.enabled) {
    const weights = computePostStratificationWeights(
      allVotes, referenceData, config.postStratification.dimensions,
    );
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.demographic = w;
    }
    activeMethods.push('post_stratification');
  }

  // Turnout weighting
  if (config.turnout.enabled) {
    const weights = computeTurnoutWeights(allVotes, config.turnout.weights);
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.turnout = w;
    }
    activeMethods.push('turnout');
  }

  // Recency weighting
  if (config.recency.enabled) {
    const weights = computeRecencyWeights(allVotes, config.recency.lambda);
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.recency = w;
    }
    activeMethods.push('recency');
  }

  // Partisan bias correction
  if (config.partisanBias.enabled) {
    const electionResults = await db.select().from(electionResults2023);
    const results = electionResults.map(r => ({
      partySlug: r.party_slug,
      voteShare: parseFloat(r.vote_share),
    }));
    const weights = computePartisanBiasWeights(allVotes, results);
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.partisanBias = w;
    }
    activeMethods.push('partisan_bias');
  }

  // Regional quota
  if (config.regionalQuota.enabled) {
    const regionRef = referenceData['region'] || [];
    const weights = computeRegionalQuotaWeights(allVotes, regionRef);
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.regionalQuota = w;
    }
    activeMethods.push('regional_quota');
  }

  // Fraud penalty
  if (config.fraudDetection.enabled) {
    for (const v of allVotes) {
      const f = weightFactorsMap.get(v.userId);
      if (f) {
        if (v.fraudScore >= config.fraudDetection.threshold) {
          f.fraudPenalty = 0;
        } else {
          f.fraudPenalty = Math.max(0, 1 - v.fraudScore / 100);
        }
      }
    }
    activeMethods.push('fraud_detection');
  }

  // Combine weights and apply cap
  const weightedVotes: WeightedVote[] = allVotes.map(v => {
    const f = weightFactorsMap.get(v.userId)!;
    let combined = f.demographic * f.turnout * f.recency * f.fraudPenalty * f.partisanBias * f.regionalQuota;

    // Apply weight cap
    combined = Math.max(config.weightCap.min, Math.min(config.weightCap.max, combined));

    return {
      ...v,
      weight: combined,
      weightFactors: f,
    };
  });

  // Compute raw and weighted party results
  const rawPartyCounts = new Map<string, number>();
  const weightedPartyCounts = new Map<string, number>();

  for (const v of weightedVotes) {
    rawPartyCounts.set(v.party, (rawPartyCounts.get(v.party) || 0) + 1);
    weightedPartyCounts.set(v.party, (weightedPartyCounts.get(v.party) || 0) + v.weight);
  }

  const totalRaw = allVotes.length;
  const totalWeighted = Array.from(weightedPartyCounts.values()).reduce((a, b) => a + b, 0);

  const parties: PartyResult[] = [];
  const allPartyKeys = new Set([...rawPartyCounts.keys(), ...weightedPartyCounts.keys()]);

  for (const party of allPartyKeys) {
    const rawCount = rawPartyCounts.get(party) || 0;
    const weightedCount = weightedPartyCounts.get(party) || 0;
    const rawPct = totalRaw > 0 ? (rawCount / totalRaw) * 100 : 0;
    const weightedPct = totalWeighted > 0 ? (weightedCount / totalWeighted) * 100 : 0;

    parties.push({
      party,
      rawCount,
      rawPct: Math.round(rawPct * 100) / 100,
      weightedCount: Math.round(weightedCount * 100) / 100,
      weightedPct: Math.round(weightedPct * 100) / 100,
      delta: Math.round((weightedPct - rawPct) * 100) / 100,
    });
  }

  parties.sort((a, b) => b.weightedCount - a.weightedCount);

  // Effective sample size
  const sumW = weightedVotes.reduce((a, v) => a + v.weight, 0);
  const sumW2 = weightedVotes.reduce((a, v) => a + v.weight * v.weight, 0);
  const effectiveSampleSize = sumW2 > 0 ? Math.round((sumW * sumW) / sumW2) : 0;

  // Confidence score
  const flaggedCount = allVotes.filter(v => v.fraudScore >= (config.fraudDetection.threshold ?? 80)).length;
  const confidence = computeConfidenceScore(allVotes, weightedVotes, referenceData, flaggedCount);

  const results: WeightedResults = {
    parties,
    confidence,
    methodology: activeMethods,
    sampleSize: totalRaw,
    effectiveSampleSize,
  };

  // Cache results (sadece override yoksa)
  if (useCache) {
    await setCachedResults(activeRoundId, cacheKey, results, isActiveRound);
  }

  return results;
}

/**
 * Şehir bazlı ağırlıklı sonuçları hesapla.
 * Her şehir için parti dağılımını ağırlıklı olarak döndürür.
 * Harita tooltip ve renklendirme için kullanılır.
 */
export interface CityWeightedParty {
  partySlug: string;
  weightedCount: number;
  weightedPct: number;
  rawCount: number;
}

export interface CityWeightedResult {
  totalWeighted: number;
  totalRaw: number;
  parties: CityWeightedParty[];
  leadingParty: string;
}

export async function computeCityWeightedResults(): Promise<Map<string, CityWeightedResult>> {
  // Find active round
  const [activeRound] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.is_active, true))
    .limit(1);

  if (!activeRound) return new Map();

  const roundId = activeRound.id;

  // Check cache
  const cacheKey = 'city-map';
  const cached = await getCachedResults(roundId, cacheKey);
  if (cached && (cached as unknown as { cityResults?: Record<string, CityWeightedResult> }).cityResults) {
    const cityResults = (cached as unknown as { cityResults: Record<string, CityWeightedResult> }).cityResults;
    return new Map(Object.entries(cityResults));
  }

  const [config, referenceData, allVotes] = await Promise.all([
    loadWeightingConfig(roundId),
    loadReferenceData(),
    loadFromAnonymousCounts(roundId),
  ]);

  if (allVotes.length === 0) return new Map();

  // Compute per-user weights (same pipeline as main engine)
  const weightFactorsMap = new Map<number, {
    demographic: number; turnout: number; recency: number;
    fraudPenalty: number; partisanBias: number; regionalQuota: number;
  }>();

  for (const v of allVotes) {
    weightFactorsMap.set(v.userId, {
      demographic: 1, turnout: 1, recency: 1,
      fraudPenalty: 1, partisanBias: 1, regionalQuota: 1,
    });
  }

  if (config.raking.enabled) {
    const { weights } = computeRakingWeights(
      allVotes, referenceData, config.raking.dimensions,
      config.raking.maxIterations, config.raking.convergenceThreshold,
    );
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.demographic = w;
    }
  } else if (config.postStratification.enabled) {
    const weights = computePostStratificationWeights(
      allVotes, referenceData, config.postStratification.dimensions,
    );
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.demographic = w;
    }
  }

  if (config.turnout.enabled) {
    const weights = computeTurnoutWeights(allVotes, config.turnout.weights);
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.turnout = w;
    }
  }

  if (config.recency.enabled) {
    const weights = computeRecencyWeights(allVotes, config.recency.lambda);
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.recency = w;
    }
  }

  if (config.partisanBias.enabled) {
    const electionResultsRows = await db.select().from(electionResults2023);
    const results = electionResultsRows.map(r => ({
      partySlug: r.party_slug,
      voteShare: parseFloat(r.vote_share),
    }));
    const weights = computePartisanBiasWeights(allVotes, results);
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.partisanBias = w;
    }
  }

  if (config.regionalQuota.enabled) {
    const regionRef = referenceData['region'] || [];
    const weights = computeRegionalQuotaWeights(allVotes, regionRef);
    for (const [userId, w] of weights) {
      const f = weightFactorsMap.get(userId);
      if (f) f.regionalQuota = w;
    }
  }

  if (config.fraudDetection.enabled) {
    for (const v of allVotes) {
      const f = weightFactorsMap.get(v.userId);
      if (f) {
        if (v.fraudScore >= config.fraudDetection.threshold) {
          f.fraudPenalty = 0;
        } else {
          f.fraudPenalty = Math.max(0, 1 - v.fraudScore / 100);
        }
      }
    }
  }

  // Combine and cap weights, group by city
  const cityData = new Map<string, { partyWeighted: Map<string, number>; partyRaw: Map<string, number> }>();

  for (const v of allVotes) {
    const f = weightFactorsMap.get(v.userId)!;
    let combined = f.demographic * f.turnout * f.recency * f.fraudPenalty * f.partisanBias * f.regionalQuota;
    combined = Math.max(config.weightCap.min, Math.min(config.weightCap.max, combined));

    if (!cityData.has(v.city)) {
      cityData.set(v.city, { partyWeighted: new Map(), partyRaw: new Map() });
    }
    const cd = cityData.get(v.city)!;
    cd.partyWeighted.set(v.party, (cd.partyWeighted.get(v.party) || 0) + combined);
    cd.partyRaw.set(v.party, (cd.partyRaw.get(v.party) || 0) + 1);
  }

  // Build result map
  const result = new Map<string, CityWeightedResult>();

  for (const [city, data] of cityData) {
    const totalWeighted = Array.from(data.partyWeighted.values()).reduce((a, b) => a + b, 0);
    const totalRaw = Array.from(data.partyRaw.values()).reduce((a, b) => a + b, 0);

    const parties: CityWeightedParty[] = [];
    for (const [partySlug, wCount] of data.partyWeighted) {
      parties.push({
        partySlug,
        weightedCount: Math.round(wCount * 100) / 100,
        weightedPct: totalWeighted > 0 ? Math.round((wCount / totalWeighted) * 10000) / 100 : 0,
        rawCount: data.partyRaw.get(partySlug) || 0,
      });
    }
    parties.sort((a, b) => b.weightedCount - a.weightedCount);

    result.set(city, {
      totalWeighted: Math.round(totalWeighted * 100) / 100,
      totalRaw,
      parties,
      leadingParty: parties.length > 0 ? parties[0].partySlug : '',
    });
  }

  // Cache as special format (reuse existing cache infrastructure)
  const ttl = 5 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttl);
  const cityResultsObj = Object.fromEntries(result);

  await db
    .insert(weightedResultsCache)
    .values({
      round_id: roundId,
      cache_key: cacheKey,
      raw_results: { cityResults: cityResultsObj } as unknown as Record<string, unknown>,
      weighted_results: { cityResults: cityResultsObj } as unknown as Record<string, unknown>,
      confidence: {} as unknown as Record<string, unknown>,
      methodology: [] as unknown as Record<string, unknown>,
      calculated_at: new Date(),
      expires_at: expiresAt,
    })
    .onConflictDoUpdate({
      target: [weightedResultsCache.round_id, weightedResultsCache.cache_key],
      set: {
        raw_results: { cityResults: cityResultsObj } as unknown as Record<string, unknown>,
        weighted_results: { cityResults: cityResultsObj } as unknown as Record<string, unknown>,
        calculated_at: new Date(),
        expires_at: expiresAt,
      },
    });

  return result;
}

function emptyResults(): WeightedResults {
  return {
    parties: [],
    confidence: {
      overall: 0, sampleSize: 0, demographicBalance: 0,
      geographicCoverage: 0, fraudRate: 100, marginOfError: 0,
    },
    methodology: [],
    sampleSize: 0,
    effectiveSampleSize: 0,
  };
}
