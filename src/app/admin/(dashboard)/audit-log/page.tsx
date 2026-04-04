'use client';
import { useState, useEffect } from 'react';
import { btn, input, table } from '@/lib/ui';

interface AuditEntry {
  id: number;
  admin_id: number;
  admin_name: string | null;
  admin_email: string | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminFilter, setAdminFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchLog() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (adminFilter) params.set('adminId', adminFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (targetTypeFilter) params.set('targetType', targetTypeFilter);

      try {
        const token = localStorage.getItem('admin_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/admin/audit-log?${params.toString()}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setEntries(data.logs || []);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchLog();
  }, [page, adminFilter, actionFilter, targetTypeFilter]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-black">Denetim Kaydı</h1>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Admin ID..."
          value={adminFilter}
          onChange={(e) => {
            setAdminFilter(e.target.value);
            setPage(1);
          }}
          className={`${input.select} w-40`}
        />
        <input
          type="text"
          placeholder="İşlem tipi..."
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className={`${input.select} w-40`}
        />
        <input
          type="text"
          placeholder="Hedef tipi..."
          value={targetTypeFilter}
          onChange={(e) => {
            setTargetTypeFilter(e.target.value);
            setPage(1);
          }}
          className={`${input.select} w-40`}
        />
      </div>

      {loading ? (
        <div className="text-neutral-500 text-sm">Yükleniyor...</div>
      ) : (
        <>
          <div className={table.container}>
            <table className="w-full text-sm">
              <thead className={table.head}>
                <tr>
                  <th className={table.th}>Tarih</th>
                  <th className={table.th}>Admin</th>
                  <th className={table.th}>İşlem</th>
                  <th className={table.th}>Hedef</th>
                  <th className={table.th}>Detay</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={table.row}
                    >
                      <td className={`${table.td} whitespace-nowrap`}>
                        {entry.created_at ? (
                          <>
                            {new Date(entry.created_at).toLocaleDateString('tr-TR', { timeZone: 'UTC' })}{' '}
                            {new Date(entry.created_at).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'UTC',
                            })}
                          </>
                        ) : '-'}
                      </td>
                      <td className={table.td}>{entry.admin_name || '-'}</td>
                      <td className={table.td}>{entry.action}</td>
                      <td className={table.td}>
                        {entry.target_type || ''} {entry.target_id ? `#${entry.target_id}` : ''}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 max-w-xs truncate">
                        {entry.details ? JSON.stringify(entry.details) : '-'}
                      </td>
                    </tr>
                  ))}
                {entries.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className={table.empty}
                    >
                      Denetim kaydı bulunamadı.
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
