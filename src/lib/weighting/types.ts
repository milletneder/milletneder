export interface VoteWithDemographics {
  userId: number;
  party: string;
  city: string;
  region: string | null;
  ageBracket: string | null;
  gender: string | null;
  education: string | null;
  incomeBracket: string | null;
  turnoutIntention: string | null;
  previousVote2023: string | null;
  voteDate: Date;
  fraudScore: number;
}

export interface WeightedVote extends VoteWithDemographics {
  weight: number;
  weightFactors: WeightFactors;
}

export interface WeightFactors {
  demographic: number;
  turnout: number;
  recency: number;
  fraudPenalty: number;
  partisanBias: number;
  regionalQuota: number;
}

export interface WeightingConfig {
  postStratification: {
    enabled: boolean;
    dimensions: string[];
  };
  raking: {
    enabled: boolean;
    dimensions: string[];
    maxIterations: number;
    convergenceThreshold: number;
  };
  turnout: {
    enabled: boolean;
    weights: Record<string, number>;
  };
  recency: {
    enabled: boolean;
    lambda: number;
  };
  bayesian: {
    enabled: boolean;
    minSampleSize: number;
    priorStrength: number;
  };
  partisanBias: {
    enabled: boolean;
  };
  regionalQuota: {
    enabled: boolean;
  };
  fraudDetection: {
    enabled: boolean;
    threshold: number;
  };
  weightCap: {
    min: number;
    max: number;
  };
}

export interface PartyResult {
  party: string;
  rawCount: number;
  rawPct: number;
  weightedCount: number;
  weightedPct: number;
  delta: number;
}

export interface ConfidenceScore {
  overall: number;
  sampleSize: number;
  demographicBalance: number;
  geographicCoverage: number;
  fraudRate: number;
  marginOfError: number;
}

export interface WeightedResults {
  parties: PartyResult[];
  confidence: ConfidenceScore;
  methodology: string[];
  sampleSize: number;
  effectiveSampleSize: number;
}

export interface ReferenceDist {
  category: string;
  share: number;
}
