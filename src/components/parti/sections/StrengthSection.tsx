'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDashboard } from '../PartyDashboardProvider';

type Scope = 'city' | 'district' | 'demographic';

interface LeaderboardRow {
  key: string;
  label: string;
  partyPct: number;
  delta: number;
  sampleSize: number;
  trend: number | null;
}

interface Breakdown {
  dimension: string;
  label: string;
  categories: LeaderboardRow[];
}

interface StrengthResponse {
  scope: Scope;
  nationalPct: number;
  partyName: string;
  weakest?: LeaderboardRow[];
  strongest?: LeaderboardRow[];
  total?: number;
  breakdowns?: Breakdown[];
}

function LeaderboardTable({ rows, nationalPct }: { rows: LeaderboardRow[]; nationalPct: number }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Veri bulunamadi</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Yer</TableHead>
            <TableHead className="text-right">Parti %</TableHead>
            <TableHead className="text-right">Ulusaldan Fark</TableHead>
            <TableHead className="text-right">Orneklem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={r.key}>
              <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
              <TableCell className="font-medium">{r.label}</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                %{r.partyPct.toFixed(1)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <Badge variant="outline" className="text-xs">
                  {r.delta > 0 ? '+' : ''}
                  {r.delta.toFixed(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                {r.sampleSize.toLocaleString('tr-TR')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground mt-3">
        Ulusal ortalama: <strong>%{nationalPct.toFixed(1)}</strong>
      </p>
    </div>
  );
}

export function StrengthSection() {
  const { apiGet, isReady } = useDashboard();
  const [scope, setScope] = useState<Scope>('city');
  const [data, setData] = useState<StrengthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    apiGet<StrengthResponse>('/api/parti/strength-weakness', { scope })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isReady, scope, apiGet]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Guclu Noktalar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Partinin ulusal ortalamanin ustunde performans gosterdigi sehir, ilce ve demografik
          segmentler.
        </p>
      </div>

      <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
        <TabsList>
          <TabsTrigger value="city">Sehir</TabsTrigger>
          <TabsTrigger value="district">Ilce</TabsTrigger>
          <TabsTrigger value="demographic">Demografi</TabsTrigger>
        </TabsList>

        <TabsContent value={scope} className="space-y-4 mt-4">
          {loading ? (
            <Skeleton className="h-96" />
          ) : error ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">{error}</CardContent>
            </Card>
          ) : data ? (
            scope === 'demographic' && data.breakdowns ? (
              data.breakdowns.map((b) => (
                <Card key={b.dimension}>
                  <CardHeader>
                    <CardTitle className="text-base">{b.label}</CardTitle>
                    <CardDescription>
                      Ulusal ortalama: %{data.nationalPct.toFixed(1)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LeaderboardTable
                      rows={[...b.categories].sort((a, b2) => b2.partyPct - a.partyPct)}
                      nationalPct={data.nationalPct}
                    />
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    En Guclu {scope === 'city' ? 'Sehirler' : 'Ilceler'}
                  </CardTitle>
                  <CardDescription>
                    {scope === 'city'
                      ? 'Partinin en yuksek oy orani aldigi 15 sehir'
                      : 'Partinin en yuksek oy orani aldigi 20 ilce'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaderboardTable
                    rows={data.strongest || []}
                    nationalPct={data.nationalPct}
                  />
                </CardContent>
              </Card>
            )
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
