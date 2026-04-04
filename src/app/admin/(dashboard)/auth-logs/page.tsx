'use client';
import { useState, useEffect } from 'react';

interface AuthLog {
  id: number;
  event_type: string;
  auth_method: string | null;
  identity_hint: string | null;
  user_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  error_code: string | null;
  error_message: string | null;
  details: string | null;
  created_at: string;
}

interface Summary {
  event_type: string;
  count: number;
}

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  login: { label: 'Giriş', color: 'bg-green-100 text-green-800' },
  login_fail: { label: 'Başarısız Giriş', color: 'bg-red-100 text-red-800' },
  register: { label: 'Kayıt', color: 'bg-blue-100 text-blue-800' },
  register_fail: { label: 'Başarısız Kayıt', color: 'bg-red-100 text-red-800' },
  register_incomplete: { label: 'Tamamlanmamış', color: 'bg-amber-100 text-amber-800' },
  register_blocked: { label: 'Engellendi', color: 'bg-red-200 text-red-900' },
  password_reset: { label: 'Şifre Sıfırlama', color: 'bg-purple-100 text-purple-800' },
  password_change: { label: 'Şifre Değişikliği', color: 'bg-purple-100 text-purple-800' },
};

export default function AuthLogsPage() {
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [page, filter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filter) params.set('event_type', filter);
      const res = await fetch(`/api/admin/auth-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setSummary(data.summary);
      }
    } catch { /* */ }
    setLoading(false);
  }

  const eventInfo = (type: string) => eventTypeLabels[type] || { label: type, color: 'bg-neutral-100 text-neutral-800' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-black">Auth Logları</h1>
        <span className="text-sm text-neutral-500">{total.toLocaleString('tr-TR')} kayıt</span>
      </div>

      {/* Özet kartları */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {summary.map((s) => {
            const info = eventInfo(s.event_type);
            return (
              <button
                key={s.event_type}
                onClick={() => { setFilter(filter === s.event_type ? '' : s.event_type); setPage(1); }}
                className={`p-3 border text-left transition-all ${filter === s.event_type ? 'border-black ring-1 ring-black' : 'border-neutral-200 hover:border-neutral-400'}`}
              >
                <div className="text-lg font-bold text-black">{s.count}</div>
                <div className="text-[10px] text-neutral-500">{info.label}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Log tablosu */}
      <div className="border border-neutral-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-3 py-2 text-left font-medium text-neutral-500">Tarih</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-500">Olay</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-500">Yöntem</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-500">Kimlik</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-500">User ID</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-500">IP</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-500">Hata</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-neutral-400">Yükleniyor...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-neutral-400">Log bulunamadı</td></tr>
            ) : (
              logs.map((log) => {
                const info = eventInfo(log.event_type);
                return (
                  <tr key={log.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-3 py-2 text-neutral-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-medium ${info.color}`}>
                        {info.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-neutral-600">{log.auth_method || '-'}</td>
                    <td className="px-3 py-2 font-mono text-neutral-600">{log.identity_hint || '-'}</td>
                    <td className="px-3 py-2 text-neutral-600">{log.user_id ?? '-'}</td>
                    <td className="px-3 py-2 font-mono text-neutral-500 text-[10px]">{log.ip_address || '-'}</td>
                    <td className="px-3 py-2">
                      {log.error_code ? (
                        <span className="text-red-600" title={log.error_message || ''}>
                          {log.error_code}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-xs border border-neutral-200 disabled:opacity-30 hover:bg-neutral-50"
          >
            Önceki
          </button>
          <span className="text-xs text-neutral-500">
            Sayfa {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-xs border border-neutral-200 disabled:opacity-30 hover:bg-neutral-50"
          >
            Sonraki
          </button>
        </div>
      )}
    </div>
  );
}
