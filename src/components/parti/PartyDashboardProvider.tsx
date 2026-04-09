'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

export type DashboardSource =
  | { kind: 'auth' }
  | { kind: 'demo'; token: string };

interface PartyInfo {
  id?: number;
  name: string;
  short_name: string;
  slug?: string;
  color?: string;
  logo_url?: string;
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
 * - Auth modunda: useAuth()'dan token alir, Bearer header gonderir
 * - Demo modunda: ?demo_token=X query parametresi ekler
 *
 * Tum bolumler bu provider altinda render edilir. useDashboard() ile erisilir.
 */
export function PartyDashboardProvider({ source, children }: ProviderProps) {
  const { token } = useAuth();
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null);
  const [isReady, setIsReady] = useState(false);

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

  const buildHeaders = useCallback(
    (extra?: Record<string, string>) => {
      const headers: Record<string, string> = { ...(extra ?? {}) };
      if (source.kind === 'auth' && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      return headers;
    },
    [source, token],
  );

  const apiGet = useCallback(
    async <T,>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> => {
      const res = await fetch(buildUrl(path, params), {
        headers: buildHeaders(),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `API hatasi: ${res.status}`);
      }
      return res.json();
    },
    [buildUrl, buildHeaders],
  );

  const apiPost = useCallback(
    async <T,>(path: string, body: unknown): Promise<T> => {
      const res = await fetch(buildUrl(path), {
        method: 'POST',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `API hatasi: ${res.status}`);
      }
      return res.json();
    },
    [buildUrl, buildHeaders],
  );

  // Auth modunda token hazir olunca, demo modunda hemen ready
  useEffect(() => {
    if (source.kind === 'demo') {
      setIsReady(true);
      return;
    }
    if (token) {
      setIsReady(true);
    }
  }, [source, token]);

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
