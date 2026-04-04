'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Admin {
  id: number;
  email: string;
  name: string;
}

export function useAdminAuth() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Cookie tabanlı auth — header göndermeye gerek yok
    fetch('/api/admin/auth/me', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('unauthorized'))))
      .then((data) => {
        setAdmin(data.admin);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        setLoading(false);
        router.push('/admin/login');
      });
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch { /* ignore */ }
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
  }, [router]);

  return { admin, loading, logout };
}

export function useAdminApi() {
  const router = useRouter();

  const apiFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      const res = await fetch(url, {
        ...options,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      if (res.status === 403) {
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
      }
      return res;
    },
    [router]
  );

  return { apiFetch };
}
