'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { badge, btn, input, table } from '@/lib/ui';

interface User {
  id: number;
  identity_hash: string | null;
  city: string;
  district: string;
  is_flagged: boolean;
  is_dummy: boolean;
  auth_provider: string;
  referral_code: string | null;
  created_at: string;
  last_login_at: string | null;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [flagFilter, setFlagFilter] = useState('');
  const [dummyFilter, setDummyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (search) params.set('search', search);
      if (city) params.set('city', city);
      if (flagFilter) params.set('flagged', flagFilter);
      if (dummyFilter) params.set('dummy', dummyFilter);

      try {
        const token = localStorage.getItem('admin_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/admin/users?${params.toString()}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [page, search, city, flagFilter, dummyFilter]);

  function handleSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-black">Kullanıcılar</h1>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="il veya referans kodu ara..."
          onChange={(e) => handleSearchChange(e.target.value)}
          className={`${input.select} w-64`}
        />
        <input
          type="text"
          placeholder="il filtrele..."
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPage(1);
          }}
          className={`${input.select} w-40`}
        />
        <select
          value={dummyFilter}
          onChange={(e) => {
            setDummyFilter(e.target.value);
            setPage(1);
          }}
          className={input.select}
        >
          <option value="">Tümü</option>
          <option value="false">Gerçek</option>
          <option value="true">Sentetik</option>
        </select>
        <select
          value={flagFilter}
          onChange={(e) => {
            setFlagFilter(e.target.value);
            setPage(1);
          }}
          className={input.select}
        >
          <option value="">Tümü</option>
          <option value="true">Şüpheli</option>
          <option value="false">Normal</option>
        </select>
      </div>

      {loading ? (
        <div className="text-neutral-500 text-sm">Yükleniyor...</div>
      ) : (
        <>
          <div className={table.container}>
            <table className="w-full text-sm">
              <thead className={table.head}>
                <tr>
                  <th className={table.th}>Kimlik Hash</th>
                  <th className={table.th}>Tür</th>
                  <th className={table.th}>İl</th>
                  <th className={table.th}>Kayıt Tarihi</th>
                  <th className={table.th}>Şüpheli</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                      className={table.row}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-black">
                        {user.identity_hash ? user.identity_hash.substring(0, 12) + '...' : <span className="text-neutral-300">—</span>}
                      </td>
                      <td className={table.td}>
                        {user.is_dummy ? (
                          <span className="text-xs text-neutral-400">Sentetik</span>
                        ) : (
                          <span className="text-xs font-medium text-black">{user.auth_provider === 'phone' ? 'SMS' : 'E-posta'}</span>
                        )}
                      </td>
                      <td className={table.td}>{user.city}</td>
                      <td className={table.td}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR', { timeZone: 'UTC' }) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {user.is_flagged ? (
                          <span className={badge.negative}>
                            Evet
                          </span>
                        ) : (
                          <span className="text-neutral-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className={table.empty}
                    >
                      Kullanıcı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-500">
              Sayfa {page} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={btn.small}
              >
                Önceki
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={btn.small}
              >
                Sonraki
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
