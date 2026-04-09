'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDashboard } from '../PartyDashboardProvider';

interface CategoryRow {
  key: string;
  label: string;
  karasizCount: number;
  karasizPct: number;
  partyPct: number;
}

interface Breakdown {
  dimension: string;
  label: string;
  categories: CategoryRow[];
  similarity: number;
}

interface SwingResponse {
  partyName: string;
  partyShortName: string;
  totalKarasiz: number;
  breakdowns: Breakdown[];
  similarityScore: number;
}

export function SwingSection() {
  const { apiGet, isReady } = useDashboard();
  const [data, setData] = useState<SwingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    apiGet<SwingResponse>('/api/parti/swing')
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isReady, apiGet]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">{error || 'Veri bulunamadi'}</p>
      </div>
    );
  }

  if (data.totalKarasiz === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Swing Secmen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Karasiz secmenlerin demografik profili ve partiyle benzerlik skoru.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Henuz karasiz secmen verisi yok.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Swing Secmen Analizi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Karasiz secmenlerin demografik profili ve {data.partyName} secmeniyle uyumu.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kararsiz Secmen Ozeti</CardTitle>
          <CardDescription>
            Toplam {data.totalKarasiz.toLocaleString('tr-TR')} kararsiz secmen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Benzerlik Skoru</span>
                <Badge variant="outline" className="tabular-nums">
                  %{data.similarityScore.toFixed(1)}
                </Badge>
              </div>
              <Progress value={data.similarityScore} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Karasiz secmenin demografik dagilimi ile {data.partyShortName} secmeninin
                demografik dagilimi arasindaki cosine similarity. Yuksek skor, kararsizlarin
                partinin profiline yakin oldugunu gosterir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.breakdowns.map((b) => (
        <Card key={b.dimension}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{b.label}</CardTitle>
              <Badge variant="outline" className="tabular-nums text-xs">
                Benzerlik: %{b.similarity.toFixed(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{b.label}</TableHead>
                  <TableHead className="text-right">Kararsiz</TableHead>
                  <TableHead className="text-right">Kararsiz %</TableHead>
                  <TableHead className="text-right">Parti Secmeni %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {b.categories.map((c) => (
                  <TableRow key={c.key}>
                    <TableCell className="font-medium">{c.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.karasizCount.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      %{c.karasizPct.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      %{c.partyPct.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
