'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';

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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  return headers;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
      close: 'Bu turu kapatmak istediginize emin misiniz?',
      extend: 'Bu turun suresini uzatmak istediginize emin misiniz?',
      publish: 'Sonuclari yayinlamak istediginize emin misiniz?',
      unpublish: 'Yayini geri almak istediginize emin misiniz?',
    };

    if (!window.confirm(confirmMessages[action] || 'Emin misiniz?')) return;

    let body: Record<string, string> = { action };
    if (action === 'extend') {
      const newEnd = window.prompt('Yeni bitis tarihi (YYYY-MM-DDTHH:mm):');
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
      alert('Bir hata olustu');
    }
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!round) {
    return <div className="text-muted-foreground text-sm">Tur bulunamadi.</div>;
  }

  const status = getRoundStatus(round);
  const statusLabels: Record<string, string> = {
    active: 'Aktif',
    closed: 'Kapanmis',
    published: 'Yayinlandi',
  };
  const statusVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
    active: 'default',
    closed: 'secondary',
    published: 'outline',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/rounds')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Turlar
        </button>
        <h1 className="text-lg font-bold text-black">Tur #{round.id}</h1>
      </div>

      <Card>
        <CardContent>
          <h2 className="text-sm font-medium text-black mb-3">Tur Bilgileri</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Baslangic</div>
              <div className="text-black">
                {round.start_date ? new Date(round.start_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Bitis</div>
              <div className="text-black">
                {round.end_date ? new Date(round.end_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Durum</div>
              <div>
                <Badge variant={statusVariants[status] || 'secondary'}>
                  {statusLabels[status] || status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-sm font-medium text-black mb-3">Oy Istatistikleri</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Toplam Oy</div>
              <div className="text-xl font-bold text-black">
                {(round.totalVotes ?? 0).toLocaleString('tr-TR')}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Gecerli Oy</div>
              <div className="text-xl font-bold text-black">
                {(round.validVotes ?? 0).toLocaleString('tr-TR')}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Gecersiz Oy</div>
              <div className="text-xl font-bold text-black">
                {(round.invalidVotes ?? 0).toLocaleString('tr-TR')}
              </div>
            </div>
          </div>

          {round.votesByParty && round.votesByParty.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-black mb-2">
                Partilere Gore
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parti</TableHead>
                    <TableHead className="text-right">Oy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {round.votesByParty.map((vp) => (
                    <TableRow key={vp.party}>
                      <TableCell>{vp.party}</TableCell>
                      <TableCell className="text-right">
                        {(vp.count ?? 0).toLocaleString('tr-TR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap">
        {status === 'active' && (
          <>
            <Button onClick={() => handleAction('close')}>
              Kapat
            </Button>
            <Button variant="outline" onClick={() => handleAction('extend')}>
              Uzat
            </Button>
          </>
        )}
        {status === 'closed' && (
          <Button onClick={() => handleAction('publish')}>
            Yayinla
          </Button>
        )}
        {status === 'published' && (
          <>
            <Button onClick={() => handleAction('publish')}>
              Tekrar Yayinla
            </Button>
            <Button variant="outline" onClick={() => handleAction('unpublish')}>
              Yayini Geri Al
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
