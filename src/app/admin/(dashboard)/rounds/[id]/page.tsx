'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { btn, table } from '@/lib/ui';

interface RoundDetail {
  id: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_published: boolean;
  totalVotes?: number;
  validVotes?: number;
  invalidVotes?: number;
  votesByParty?: { party: string; count: number }[];
}

function getRoundStatus(round: RoundDetail) {
  if (round.is_published) return 'published';
  if (round.is_active) return 'active';
  return 'closed';
}

function getAdminHeaders() {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Admin-Token'] = token;
  return headers;
}

export default function RoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [round, setRound] = useState<RoundDetail | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchRound() {
    try {
      const res = await fetch(`/api/admin/rounds/${id}`, { headers: getAdminHeaders() });
      if (res.ok) {
        const data = await res.json();
        const roundData = data.round;
        const stats = data.stats;
        setRound({
          ...roundData,
          totalVotes: stats?.totalVotes ?? 0,
          validVotes: stats?.validVotes ?? 0,
          invalidVotes: stats?.invalidVotes ?? ((stats?.totalVotes ?? 0) - (stats?.validVotes ?? 0)),
          votesByParty: stats?.partyDistribution ?? [],
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAction(action: string) {
    const confirmMessages: Record<string, string> = {
      close: 'Bu turu kapatmak istediğinize emin misiniz?',
      extend: 'Bu turun süresini uzatmak istediğinize emin misiniz?',
      publish: 'Sonuçları yayınlamak istediğinize emin misiniz?',
      unpublish: 'Yayını geri almak istediğinize emin misiniz?',
    };

    if (!window.confirm(confirmMessages[action] || 'Emin misiniz?')) return;

    let body: Record<string, string> = { action };
    if (action === 'extend') {
      const newEnd = window.prompt('Yeni bitiş tarihi (YYYY-MM-DDTHH:mm):');
      if (!newEnd) return;
      body = { action, end_date: newEnd };
    }

    try {
      const res = await fetch(`/api/admin/rounds/${id}`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        fetchRound();
      } else {
        const data = await res.json();
        alert(data.error || 'İşlem başarısız');
      }
    } catch {
      alert('Bir hata oluştu');
    }
  }

  if (loading) {
    return <div className="text-neutral-500 text-sm">Yükleniyor...</div>;
  }

  if (!round) {
    return <div className="text-neutral-500 text-sm">Tur bulunamadı.</div>;
  }

  const status = getRoundStatus(round);
  const statusLabels: Record<string, string> = {
    active: 'Aktif',
    closed: 'Kapanmış',
    published: 'Yayınlandı',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/rounds')}
          className="text-sm text-neutral-500 hover:text-black transition-colors"
        >
          &larr; Turlar
        </button>
        <h1 className="text-lg font-bold text-black">Tur #{round.id}</h1>
      </div>

      <div className="border border-neutral-200 p-4 space-y-3">
        <h2 className="text-sm font-medium text-black">Tur Bilgileri</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-neutral-500">Başlangıç</div>
            <div className="text-black">
              {round.start_date ? new Date(round.start_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}
            </div>
          </div>
          <div>
            <div className="text-neutral-500">Bitiş</div>
            <div className="text-black">
              {round.end_date ? new Date(round.end_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}
            </div>
          </div>
          <div>
            <div className="text-neutral-500">Durum</div>
            <div className="text-black">
              {statusLabels[status] || status}
            </div>
          </div>
        </div>
      </div>

      <div className="border border-neutral-200 p-4 space-y-3">
        <h2 className="text-sm font-medium text-black">Oy İstatistikleri</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-neutral-500">Toplam Oy</div>
            <div className="text-xl font-bold text-black">
              {(round.totalVotes ?? 0).toLocaleString('tr-TR')}
            </div>
          </div>
          <div>
            <div className="text-neutral-500">Geçerli Oy</div>
            <div className="text-xl font-bold text-black">
              {(round.validVotes ?? 0).toLocaleString('tr-TR')}
            </div>
          </div>
          <div>
            <div className="text-neutral-500">Geçersiz Oy</div>
            <div className="text-xl font-bold text-black">
              {(round.invalidVotes ?? 0).toLocaleString('tr-TR')}
            </div>
          </div>
        </div>

        {round.votesByParty && round.votesByParty.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-black mb-2">
              Partilere Göre
            </h3>
            <div className={table.container}>
              <table className="w-full text-sm">
                <thead className={table.head}>
                  <tr>
                    <th className={table.th}>
                      Parti
                    </th>
                    <th className={`${table.th} text-right`}>
                      Oy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {round.votesByParty.map((vp) => (
                    <tr
                      key={vp.party}
                      className="border-b border-neutral-100"
                    >
                      <td className={table.td}>{vp.party}</td>
                      <td className={`${table.td} text-right`}>
                        {(vp.count ?? 0).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        {status === 'active' && (
          <>
            <button
              onClick={() => handleAction('close')}
              className={btn.primary}
            >
              Kapat
            </button>
            <button
              onClick={() => handleAction('extend')}
              className={btn.secondary}
            >
              Uzat
            </button>
          </>
        )}
        {status === 'closed' && (
          <button
            onClick={() => handleAction('publish')}
            className={btn.primary}
          >
            Yayınla
          </button>
        )}
        {status === 'published' && (
          <>
            <button
              onClick={() => handleAction('publish')}
              className={btn.primary}
            >
              Tekrar Yayınla
            </button>
            <button
              onClick={() => handleAction('unpublish')}
              className={btn.secondary}
            >
              Yayını Geri Al
            </button>
          </>
        )}
      </div>
    </div>
  );
}
