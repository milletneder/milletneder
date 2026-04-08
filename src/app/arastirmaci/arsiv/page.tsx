'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Loader2Icon, ArrowRightLeftIcon } from 'lucide-react';

interface RoundSummary {
  id: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  total_votes: number;
  parties: { party: string; votes: number; percentage: number }[];
}

export default function ArchivePage() {
  const { token } = useAuth();
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [compareRound, setCompareRound] = useState<number | null>(null);

  const fetchArchive = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/researcher/archive', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Arsiv yuklenemedi');
      }

      const data = await res.json();
      setRounds(data.rounds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  const handleSelectRound = (roundId: number) => {
    if (selectedRound === roundId) {
      setSelectedRound(null);
    } else if (compareRound === roundId) {
      setCompareRound(null);
    } else if (selectedRound === null) {
      setSelectedRound(roundId);
    } else if (compareRound === null) {
      setCompareRound(roundId);
    } else {
      setSelectedRound(roundId);
      setCompareRound(null);
    }
  };

  const clearComparison = () => {
    setSelectedRound(null);
    setCompareRound(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
    });
  };

  const selectedData = rounds.find((r) => r.id === selectedRound);
  const compareData = rounds.find((r) => r.id === compareRound);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Arsiv
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gecmis turlarin sonuclari ve karsilastirma.
        </p>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Selection Info */}
      {(selectedRound || compareRound) && (
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-2 text-sm">
              {selectedRound && (
                <Badge variant="outline">Tur #{selectedRound}</Badge>
              )}
              {compareRound && (
                <>
                  <ArrowRightLeftIcon className="h-3.5 w-3.5 text-neutral-400" />
                  <Badge variant="outline">Tur #{compareRound}</Badge>
                </>
              )}
              {!compareRound && selectedRound && (
                <span className="text-xs text-neutral-400">
                  Karsilastirmak icin ikinci bir tur secin
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={clearComparison}>
              Temizle
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rounds List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Turlar</CardTitle>
          <CardDescription>
            {rounds.length} tur bulundu. Detay gormek veya karsilastirma yapmak icin secim yapin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tur</TableHead>
                <TableHead>Donem</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Toplam Oy</TableHead>
                <TableHead>En Yuksek Parti</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rounds.map((round) => {
                const topParty = round.parties[0];
                const isSelected =
                  selectedRound === round.id || compareRound === round.id;

                return (
                  <TableRow
                    key={round.id}
                    className={isSelected ? 'bg-neutral-50' : ''}
                  >
                    <TableCell className="font-medium">#{round.id}</TableCell>
                    <TableCell className="text-xs text-neutral-600">
                      {formatDate(round.start_date)} - {formatDate(round.end_date)}
                    </TableCell>
                    <TableCell>
                      {round.is_active ? (
                        <Badge variant="outline" className="text-[10px]">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Tamamlandi
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {round.total_votes.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-xs">
                      {topParty
                        ? `${topParty.party} (%${topParty.percentage.toFixed(1)})`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSelectRound(round.id)}
                      >
                        {isSelected ? 'Secili' : 'Sec'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rounds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-neutral-400 py-8">
                    Henuz arsivlenmis tur bulunmuyor.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Comparison / Detail View */}
      {selectedData && (
        <div className={`grid gap-4 ${compareData ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tur #{selectedData.id}
              </CardTitle>
              <CardDescription>
                {formatDate(selectedData.start_date)} - {formatDate(selectedData.end_date)}
                {' | '}
                {selectedData.total_votes.toLocaleString('tr-TR')} oy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parti</TableHead>
                    <TableHead className="text-right">Oy</TableHead>
                    <TableHead className="text-right">Oran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedData.parties.map((p) => (
                    <TableRow key={p.party}>
                      <TableCell className="font-medium">{p.party}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.votes.toLocaleString('tr-TR')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        %{p.percentage.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {compareData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Tur #{compareData.id}
                </CardTitle>
                <CardDescription>
                  {formatDate(compareData.start_date)} - {formatDate(compareData.end_date)}
                  {' | '}
                  {compareData.total_votes.toLocaleString('tr-TR')} oy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parti</TableHead>
                      <TableHead className="text-right">Oy</TableHead>
                      <TableHead className="text-right">Oran</TableHead>
                      <TableHead className="text-right">Degisim</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compareData.parties.map((p) => {
                      const prev = selectedData.parties.find(
                        (sp) => sp.party === p.party
                      );
                      const diff = prev
                        ? p.percentage - prev.percentage
                        : p.percentage;

                      return (
                        <TableRow key={p.party}>
                          <TableCell className="font-medium">{p.party}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {p.votes.toLocaleString('tr-TR')}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            %{p.percentage.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {diff > 0 ? '+' : ''}
                            {diff.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
