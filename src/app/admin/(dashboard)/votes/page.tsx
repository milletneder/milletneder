'use client';
import { useState, useEffect } from 'react';
import { badge, btn, input, table } from '@/lib/ui';

interface Vote {
  id: number;
  user_name?: string;
  party: string;
  city: string;
  round_id?: number;
  is_valid: boolean;
  created_at?: string;
}

function getAdminHeaders() {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export default function VotesPage() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [roundFilter, setRoundFilter] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [validFilter, setValidFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function fetchVotes() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (roundFilter) params.set('roundId', roundFilter);
    if (partyFilter) params.set('party', partyFilter);
    if (cityFilter) params.set('city', cityFilter);
    if (validFilter) params.set('isValid', validFilter);

    try {
      const res = await fetch(`/api/admin/votes?${params.toString()}`, { headers: getAdminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setVotes(data.votes || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roundFilter, partyFilter, cityFilter, validFilter]);

  async function handleToggleValid(voteId: number, currentValid: boolean) {
    const action = currentValid ? 'invalidate' : 'validate';
    const message = currentValid
      ? 'Bu oyu geçersiz kılmak istediğinize emin misiniz?'
      : 'Bu oyu geçerli yapmak istediğinize emin misiniz?';

    if (!window.confirm(message)) return;

    try {
      const res = await fetch(`/api/admin/votes/${voteId}`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchVotes();
      } else {
        const data = await res.json();
        alert(data.error || 'İşlem başarısız');
      }
    } catch {
      alert('Bir hata oluştu');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-black">Oylar</h1>

      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="tur id..." value={roundFilter}
          onChange={(e) => { setRoundFilter(e.target.value); setPage(1); }}
          className={`${input.select} w-32`} />
        <input type="text" placeholder="parti..." value={partyFilter}
          onChange={(e) => { setPartyFilter(e.target.value); setPage(1); }}
          className={`${input.select} w-32`} />
        <input type="text" placeholder="il..." value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
          className={`${input.select} w-32`} />
        <select value={validFilter}
          onChange={(e) => { setValidFilter(e.target.value); setPage(1); }}
          className={input.select}>
          <option value="">Tüm Oylar</option>
          <option value="true">Geçerli</option>
          <option value="false">Geçersiz</option>
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
                  <th className={table.th}>ID</th>
                  <th className={table.th}>Kullanıcı</th>
                  <th className={table.th}>Parti</th>
                  <th className={table.th}>İl</th>
                  <th className={table.th}>Tur</th>
                  <th className={table.th}>Durum</th>
                  <th className={table.th}>Tarih</th>
                  <th className={`${table.th} text-right`}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((vote) => (
                  <tr key={vote.id} className={table.row}>
                    <td className={table.td}>#{vote.id}</td>
                    <td className={table.td}>{vote.user_name || '-'}</td>
                    <td className={table.td}>{vote.party}</td>
                    <td className={table.td}>{vote.city}</td>
                    <td className={table.td}>#{vote.round_id}</td>
                    <td className="px-4 py-3">
                      <span className={vote.is_valid ? badge.positive : badge.negative}>
                        {vote.is_valid ? 'Geçerli' : 'Geçersiz'}
                      </span>
                    </td>
                    <td className={table.td}>
                      {vote.created_at ? new Date(vote.created_at).toLocaleDateString('tr-TR', { timeZone: 'UTC' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleValid(vote.id, vote.is_valid)}
                        className={btn.small}
                      >
                        {vote.is_valid ? 'Geçersiz Kıl' : 'Geçerli Yap'}
                      </button>
                    </td>
                  </tr>
                ))}
                {votes.length === 0 && (
                  <tr>
                    <td colSpan={8} className={table.empty}>
                      Oy bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-500">Sayfa {page} / {totalPages}</div>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className={btn.small}>
                Önceki
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className={btn.small}>
                Sonraki
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
