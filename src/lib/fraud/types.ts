export interface FraudFactors {
  ipSubnet: number;
  vpn: number;
  youngAccount: number;
  disposableEmail: number;
  sequentialEmail: number;
  emptyProfile: number;
  suspiciousUa: number;
}

export interface FraudScoringConfig {
  ipSubnetThreshold: number;
  ipSubnetMaxScore: number;
  vpnScore: number;
  youngAccountScore: number;
  youngAccountHours: number;
  disposableEmailScore: number;
  sequentialEmailScore: number;
  emptyProfileScore: number;
  suspiciousUaScore: number;
}

export const DEFAULT_FRAUD_CONFIG: FraudScoringConfig = {
  ipSubnetThreshold: 3,
  ipSubnetMaxScore: 25,
  vpnScore: 20,
  youngAccountScore: 10,
  youngAccountHours: 1,
  disposableEmailScore: 15,
  sequentialEmailScore: 10,
  emptyProfileScore: 5,
  suspiciousUaScore: 15,
};
