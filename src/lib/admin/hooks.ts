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
    // Auth kontrolünü tamamen localStorage'dan yap
    // API çağrısı yapmıyoruz → nginx Basic Auth ile çakışma yok
    const token = localStorage.getItem('admin_token');
    const adminData = localStorage.getItem('admin_data');

    if (!token || !adminData) {
      setLoading(false);
      router.push('/admin/login');
      return;
    }

    try {
      // JWT expiry kontrolü (sunucuya sormadan)
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token süresi dolmuş
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_data');
        setLoading(false);
        router.push('/admin/login');
        return;
      }

      setAdmin(JSON.parse(adminData));
      setLoading(false);
    } catch {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_data');
      setLoading(false);
      router.push('/admin/login');
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
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
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      if (res.status === 403) {
        // Token geçersiz veya süresi dolmuş — tekrar login'e yönlendir
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_data');
        router.push('/admin/login');
      }
      return res;
    },
    [router]
  );

  return { apiFetch };
}
