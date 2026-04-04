'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { badge, btn, table } from '@/lib/ui';

interface Round {
  id: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_published: boolean;
}

function getRoundStatus(round: Round) {
  if (round.is_published) return 'published';
  if (round.is_active) return 'active';
  return 'closed';
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: badge.positive,
    closed: badge.neutral,
    published: badge.dark,
  };
  const labels: Record<string, string> = {
    active: 'Aktif',
    closed: 'Kapanmış',
    published: 'Yayınlandı',
  };
  return (
    <span className={styles[status] || badge.neutral}>
      {labels[status] || status}
    </span>
  );
}

export default function RoundsPage() {
  const router = useRouter();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('admin_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/admin/rounds', { headers });
        if (res.ok) {
          const data = await res.json();
          setRounds(data.rounds || []);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-black">Turlar</h1>
        <Link
          href="/admin/rounds/new"
          className={btn.primary}
        >
          Yeni Tur
        </Link>
      </div>

      {loading ? (
        <div className="text-neutral-500 text-sm">Yükleniyor...</div>
      ) : (
        <div className={table.container}>
          <table className="w-full text-sm">
            <thead className={table.head}>
              <tr>
                <th className={table.th}>ID</th>
                <th className={table.th}>Başlangıç</th>
                <th className={table.th}>Bitiş</th>
                <th className={table.th}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((round) => (
                <tr
                  key={round.id}
                  onClick={() => router.push(`/admin/rounds/${round.id}`)}
                  className={table.row}
                >
                  <td className={table.td}>#{round.id}</td>
                  <td className={table.td}>
                    {round.start_date ? new Date(round.start_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}
                  </td>
                  <td className={table.td}>
                    {round.end_date ? new Date(round.end_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={getRoundStatus(round)} />
                  </td>
                </tr>
              ))}
              {rounds.length === 0 && (
                <tr>
                  <td colSpan={4} className={table.empty}>
                    Henüz tur bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
