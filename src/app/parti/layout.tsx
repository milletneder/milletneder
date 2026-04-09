'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFeature } from '@/hooks/useFeature';
import { FEATURES } from '@/lib/billing/features';
import { Skeleton } from '@/components/ui/skeleton';
import { PartyDashboardProvider } from '@/components/parti/PartyDashboardProvider';
import { PartyDashboardShell } from '@/components/parti/PartyDashboardShell';

export default function PartiLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { allowed } = useFeature(FEATURES.PARTY_DASHBOARD);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/giris?redirect=/parti');
      return;
    }
    if (!allowed) {
      router.replace('/ucretler');
      return;
    }
    setChecking(false);
  }, [isLoggedIn, allowed, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  return (
    <PartyDashboardProvider source={{ kind: 'auth' }}>
      <PartyDashboardShell>{children}</PartyDashboardShell>
    </PartyDashboardProvider>
  );
}
