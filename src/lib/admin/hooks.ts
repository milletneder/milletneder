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
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setLoading(false);
      router.push('/admin/login');
      return;
    }

    fetch('/api/admin/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
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

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
  }, [router]);

  return { admin, loading, logout };
}

export function useAdminApi() {
  const router = useRouter();

  const apiFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options?.headers,
        },
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
      }
      return res;
    },
    [router]
  );

  return { apiFetch };
}
