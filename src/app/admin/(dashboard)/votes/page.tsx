'use client';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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
        <Input
          type="text"
          placeholder="tur id..."
          value={roundFilter}
          onChange={(e) => { setRoundFilter(e.target.value); setPage(1); }}
          className="w-32"
        />
        <Input
          type="text"
          placeholder="parti..."
          value={partyFilter}
          onChange={(e) => { setPartyFilter(e.target.value); setPage(1); }}
          className="w-32"
        />
        <Input
          type="text"
          placeholder="il..."
          value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
          className="w-32"
        />
        <Select
          value={validFilter}
          onValueChange={(value) => { setValidFilter(value === 'all' ? '' : value); setPage(1); }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tüm Oylar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Oylar</SelectItem>
            <SelectItem value="true">Geçerli</SelectItem>
            <SelectItem value="false">Geçersiz</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Parti</TableHead>
                <TableHead>İl</TableHead>
                <TableHead>Tur</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {votes.map((vote) => (
                <TableRow key={vote.id}>
                  <TableCell>#{vote.id}</TableCell>
                  <TableCell>{vote.user_name || '-'}</TableCell>
                  <TableCell>{vote.party}</TableCell>
                  <TableCell>{vote.city}</TableCell>
                  <TableCell>#{vote.round_id}</TableCell>
                  <TableCell>
                    <Badge variant={vote.is_valid ? 'default' : 'destructive'}>
                      {vote.is_valid ? 'Geçerli' : 'Geçersiz'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {vote.created_at ? new Date(vote.created_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleValid(vote.id, vote.is_valid)}
                    >
                      {vote.is_valid ? 'Geçersiz Kıl' : 'Geçerli Yap'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {votes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Oy bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-500">Sayfa {page} / {totalPages}</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Önceki
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Sonraki
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
