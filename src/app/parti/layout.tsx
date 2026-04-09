'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePartyAuth } from '@/lib/auth/PartyAuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { PartyDashboardProvider } from '@/components/parti/PartyDashboardProvider';
import { PartyDashboardShell } from '@/components/parti/PartyDashboardShell';

/**
 * /parti/* authenticated shell.
 *
 * Bu layout sadece /parti/giris DISINDAKI rotalar icin calisir.
 * (/parti/giris (parti-public) route grubu altinda ve bu layout'u atlar.)
 *
 * Kurumsal parti hesap oturumu gerektirir (party_token cookie).
 * Bireysel user JWT'si bu layout'u gecemez.
 */
export default function PartiLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoggedIn, hydrating } = usePartyAuth();

  useEffect(() => {
    if (hydrating) return;
    if (!isLoggedIn) {
      router.replace('/parti/giris');
    }
  }, [hydrating, isLoggedIn, router]);

  if (hydrating || !isLoggedIn) {
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
