'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { PlanTier } from '@/lib/billing/plans';

interface AuthState {
  isLoggedIn: boolean;
  token: string | null;
  subscriptionTier: PlanTier;
  login: (token: string) => void;
  logout: () => void;
  refreshSubscription: () => void;
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  token: null,
  subscriptionTier: 'free',
  login: () => {},
  logout: () => {},
  refreshSubscription: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<PlanTier>('free');

  const fetchSubscription = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/billing/subscription', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptionTier((data.tier as PlanTier) || 'free');
      }
    } catch {
      // Silent fail — tier stays as 'free'
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setIsLoggedIn(true);
      setToken(savedToken);
      fetchSubscription(savedToken);
    }
  }, [fetchSubscription]);

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setIsLoggedIn(true);
    fetchSubscription(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsLoggedIn(false);
    setSubscriptionTier('free');
  };

  const refreshSubscription = useCallback(() => {
    if (token) fetchSubscription(token);
  }, [token, fetchSubscription]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, token, subscriptionTier, login, logout, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
