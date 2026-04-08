'use client';

import { type ReactNode } from 'react';
import { useFeature } from '@/hooks/useFeature';
import { UpgradePrompt } from './UpgradePrompt';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Belirli bir feature'a erişimi olan kullanıcılara children'ı gösterir.
 * Erişim yoksa UpgradePrompt veya özel fallback gösterir.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { allowed } = useFeature(feature);

  if (allowed) return <>{children}</>;
  return <>{fallback ?? <UpgradePrompt feature={feature} />}</>;
}
