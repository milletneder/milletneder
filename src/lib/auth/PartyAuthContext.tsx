'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Kurumsal parti hesap oturum state'i.
 *
 * Bireysel AuthContext ve admin session'dan tamamen bagimsiz.
 * party_token httpOnly cookie'dedir — JS'den okunmaz. Oturum
 * dogrulugu GET /api/parti/auth/me ile kontrol edilir.
 * localStorage sadece metadata (email, party info) tutar.
 */

export interface PartyInfo {
  id: number;
  slug: string;
  name: string;
  short_name: string;
  color: string;
  text_color?: string | null;
  logo_url?: string | null;
}

export interface PartyAccountInfo {
  id: number;
  email: string;
  last_login_at?: string | null;
}

interface PartyAuthState {
  isLoggedIn: boolean;
  hydrating: boolean;
  account: PartyAccountInfo | null;
  party: PartyInfo | null;
  login: (account: PartyAccountInfo, party: PartyInfo) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const PartyAuthContext = createContext<PartyAuthState>({
  isLoggedIn: false,
  hydrating: true,
  account: null,
  party: null,
  login: () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function PartyAuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<PartyAccountInfo | null>(null);
  const [party, setParty] = useState<PartyInfo | null>(null);
  const [hydrating, setHydrating] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/parti/auth/me', {
        credentials: 'include',
      });
      if (!res.ok) {
        setAccount(null);
        setParty(null);
        localStorage.removeItem('party_data');
        return;
      }
      const data = await res.json();
      setAccount(data.account);
      setParty(data.party);
      localStorage.setItem(
        'party_data',
        JSON.stringify({ account: data.account, party: data.party }),
      );
    } catch {
      setAccount(null);
      setParty(null);
    }
  }, []);

  // Mount: localStorage'tan optimistic hydrate + /me ile dogrula
  useEffect(() => {
    let mounted = true;

    try {
      const raw = localStorage.getItem('party_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.account && parsed?.party) {
          setAccount(parsed.account);
          setParty(parsed.party);
        }
      }
    } catch {
      // ignore
    }

    // Server'dan cookie geçerliligini dogrula
    refresh().finally(() => {
      if (mounted) setHydrating(false);
    });

    return () => {
      mounted = false;
    };
  }, [refresh]);

  const login = useCallback((acc: PartyAccountInfo, p: PartyInfo) => {
    setAccount(acc);
    setParty(p);
    try {
      localStorage.setItem('party_data', JSON.stringify({ account: acc, party: p }));
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/parti/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore — devam et, localStorage zaten temizleniyor
    }
    localStorage.removeItem('party_data');
    setAccount(null);
    setParty(null);
  }, []);

  return (
    <PartyAuthContext.Provider
      value={{
        isLoggedIn: !!account && !!party,
        hydrating,
        account,
        party,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </PartyAuthContext.Provider>
  );
}

export function usePartyAuth(): PartyAuthState {
  return useContext(PartyAuthContext);
}
