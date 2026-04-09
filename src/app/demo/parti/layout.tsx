'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { PartyDashboardProvider } from '@/components/parti/PartyDashboardProvider';
import { PartyDashboardShell } from '@/components/parti/PartyDashboardShell';

/**
 * /demo/parti/* layout
 *
 * Token query parametresinden alinir, /api/demo/validate ile bir kez
 * dogrulanir, sonra PartyDashboardProvider source={kind:'demo'} ile
 * tum alt sayfalar tek context altinda calisir.
 *
 * Tum API istekleri provider tarafindan ?demo_token=X eklenerek yapilir.
 * Hicbir kilit ekrani veya 'abone ol' CTA'si gosterilmez — tam panel.
 */
export default function DemoPartiLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Skeleton className="h-8 w-32" />
        </div>
      }
    >
      <DemoLayoutInner>{children}</DemoLayoutInner>
    </Suspense>
  );
}

function DemoLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Demo token belirtilmedi');
      setValidating(false);
      return;
    }

    fetch('/api/demo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Gecersiz veya suresi dolmus demo link');
        return res.json();
      })
      .then(() => setValid(true))
      .catch((e) => setError(e.message))
      .finally(() => setValidating(false));
  }, [token]);

  if (validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  if (error || !valid || !token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Lock className="size-10 text-muted-foreground mb-3" />
            <h1 className="text-lg font-semibold mb-2">Demo Erisimi</h1>
            <p className="text-sm text-muted-foreground mb-5">
              {error || 'Bu demo linki gecersiz veya suresi dolmus.'}
            </p>
            <Button variant="outline" asChild>
              <a href="mailto:iletisim@milletneder.com">Iletisime Gec</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PartyDashboardProvider source={{ kind: 'demo', token }}>
      <PartyDashboardShell>{children}</PartyDashboardShell>
    </PartyDashboardProvider>
  );
}
