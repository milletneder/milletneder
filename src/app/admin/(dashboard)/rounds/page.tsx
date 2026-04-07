'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';

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
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    active: 'default',
    closed: 'secondary',
    published: 'outline',
  };
  const labels: Record<string, string> = {
    active: 'Aktif',
    closed: 'Kapanmis',
    published: 'Yayinlandi',
  };
  return (
    <Badge variant={variants[status] || 'secondary'}>
      {labels[status] || status}
    </Badge>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function RoundsPage() {
  const router = useRouter();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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
        <Button asChild>
          <Link href="/admin/rounds/new">Yeni Tur</Link>
        </Button>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Baslangic</TableHead>
              <TableHead>Bitis</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rounds.map((round) => (
              <TableRow
                key={round.id}
                onClick={() => router.push(`/admin/rounds/${round.id}`)}
                className="cursor-pointer"
              >
                <TableCell>#{round.id}</TableCell>
                <TableCell>
                  {round.start_date ? new Date(round.start_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}
                </TableCell>
                <TableCell>
                  {round.end_date ? new Date(round.end_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={getRoundStatus(round)} />
                </TableCell>
              </TableRow>
            ))}
            {rounds.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Henuz tur bulunmuyor.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
