'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePartyAuth } from '@/lib/auth/PartyAuthContext';

export type DashboardSource =
  | { kind: 'auth' }
  | { kind: 'demo'; token: string };

interface PartyInfo {
  id?: number;
  name: string;
  short_name: string;
  slug?: string;
  color?: string;
  logo_url?: string | null;
}

interface DashboardContextValue {
  source: DashboardSource;
  partyInfo: PartyInfo | null;
  setPartyInfo: (p: PartyInfo | null) => void;
  isReady: boolean;
  apiGet: <T = unknown>(path: string, params?: Record<string, string | number | boolean | undefined>) => Promise<T>;
  apiPost: <T = unknown>(path: string, body: unknown) => Promise<T>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

interface ProviderProps {
  source: DashboardSource;
  children: React.ReactNode;
}

/**
 * Parti dashboard provider.
 * - Auth modunda: party_token httpOnly cookie ile — JS token'a erisemez.
 *   fetch credentials: 'include' ile cookie otomatik gonderilir.
 * - Demo modunda: ?demo_token=X query parametresi ile.
 *
 * usePartyAuth'tan gelen party bilgisi partyInfo'ya hydrate edilir.
 */
export function PartyDashboardProvider({ source, children }: ProviderProps) {
  const { party, isLoggedIn, hydrating } = usePartyAuth();
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null);

  // usePartyAuth'tan partyInfo'yu hydrate et
  useEffect(() => {
    if (source.kind !== 'auth') return;
    if (party) {
      setPartyInfo({
        id: party.id,
        name: party.name,
        short_name: party.short_name,
        slug: party.slug,
        color: party.color,
        logo_url: party.logo_url,
      });
    } else {
      setPartyInfo(null);
    }
  }, [source.kind, party]);

  const buildUrl = useCallback(
    (path: string, params?: Record<string, string | number | boolean | undefined>) => {
      const url = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value === undefined) continue;
          url.searchParams.set(key, String(value));
        }
      }
      if (source.kind === 'demo') {
        url.searchParams.set('demo_token', source.token);
      }
      return url.pathname + url.search;
    },
    [source],
  );

  const apiGet = useCallback(
    async <T,>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> => {
      const res = await fetch(buildUrl(path, params), {
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `API hatasi: ${res.status}`);
      }
      return res.json();
    },
    [buildUrl],
  );

  const apiPost = useCallback(
    async <T,>(path: string, body: unknown): Promise<T> => {
      const res = await fetch(buildUrl(path), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `API hatasi: ${res.status}`);
      }
      return res.json();
    },
    [buildUrl],
  );

  // Auth modunda: oturum hydrate olduktan ve login olunca ready.
  // Demo modunda: hemen ready.
  const isReady = source.kind === 'demo' ? true : !hydrating && isLoggedIn;

  const value = useMemo<DashboardContextValue>(
    () => ({ source, partyInfo, setPartyInfo, isReady, apiGet, apiPost }),
    [source, partyInfo, isReady, apiGet, apiPost],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used inside PartyDashboardProvider');
  }
  return ctx;
}
