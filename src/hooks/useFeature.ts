'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { hasFeature } from '@/lib/billing/features';
import type { PlanTier } from '@/lib/billing/plans';

/**
 * Client-side feature erişim kontrolü.
 * AuthContext'teki subscriptionTier'ı kullanır.
 */
export function useFeature(feature: string): { allowed: boolean; tier: PlanTier } {
  const { subscriptionTier } = useAuth();
  return {
    allowed: hasFeature(subscriptionTier, feature),
    tier: subscriptionTier,
  };
}
