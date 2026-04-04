export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  city: string | null;
  district: string | null;
  deviceFingerprint: string | null;
  referralCode: string | null;
  referredBy: string | null;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  isFlagged: boolean;
  flagReason: string | null;
}

export interface Vote {
  id: string;
  userId: string;
  roundId: string;
  party: string;
  isValid: boolean;
  invalidationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoteChange {
  id: string;
  userId: string;
  roundId: string;
  fromParty: string;
  toParty: string;
  changedAt: Date;
}

export interface Round {
  id: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  resultsPublished: boolean;
  resultsPublishedAt: Date | null;
}

export interface DeviceLog {
  id: string;
  userId: string;
  fingerprint: string;
  ipAddress: string | null;
  userAgent: string | null;
  loggedAt: Date;
}

export interface Badge {
  id: string;
  userId: string;
  badgeType: string;
  district: string | null;
  earnedAt: Date;
}

export interface Party {
  id: string;
  name: string;
  shortName: string;
  color: string;
  textColor: string;
}

export interface CityResult {
  city: string;
  totalVotes: number;
  partyBreakdown: Record<string, number>;
  leadingParty: string;
}

export interface DistrictResult {
  city: string;
  district: string;
  totalVotes: number;
  partyBreakdown: Record<string, number>;
  leadingParty: string;
}

export interface TransparencyData {
  totalUsers: number;
  totalVotes: number;
  totalValidVotes: number;
  totalInvalidVotes: number;
  flaggedAccounts: number;
  cityCoverage: number;
  districtCoverage: number;
  roundId: string;
  lastUpdated: Date;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  city: string | null;
  district: string | null;
  roundsParticipated: number;
  referralCount: number;
  badges: Badge[];
}
