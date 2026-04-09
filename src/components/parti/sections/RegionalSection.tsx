'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useDashboard } from '../PartyDashboardProvider';

interface Region {
  key: string;
  label: string;
  partyPct: number;
  delta: number;
  rank: number;
  totalParties: number;
  totalVotes: number;
  partyVotes: number;
  strongestCity: { city: string; pct: number; sample: number } | null;
  weakestCity: { city: string; pct: number; sample: number } | null;
}

interface RegionsResponse {
  partyName: string;
  partyShortName: string;
  nationalPct: number;
  regions: Region[];
}

const chartConfig: ChartConfig = {
  partyPct: { label: 'Parti %', color: 'var(--color-neutral-900)' },
};

export function RegionalSection() {
  const { apiGet, isReady } = useDashboard();
  const [data, setData] = useState<RegionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    apiGet<RegionsResponse>('/api/parti/regions')
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isReady, apiGet]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
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

  const chartData = data.regions.map((r) => ({
    name: r.label,
    partyPct: r.partyPct,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bolgesel Breakdown</h1>
        <p className="text-sm text-muted-foreground mt-1">
          7 Turkiye bolgesinde {data.partyName} ({data.partyShortName}) performansi.
          Ulusal ortalama: <strong>%{data.nationalPct.toFixed(1)}</strong>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bolge Karsilastirmasi</CardTitle>
          <CardDescription>Her bolgede partinin oy yuzdesi</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-xs"
                tickFormatter={(v: number) => `%${v}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="partyPct" fill="var(--color-neutral-700)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.regions.map((r) => (
          <Card key={r.key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{r.label}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {r.rank}. / {r.totalParties}
                </Badge>
              </div>
              <CardDescription>
                {r.totalVotes.toLocaleString('tr-TR')} toplam oy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">%{r.partyPct.toFixed(1)}</span>
                <Badge variant="outline" className="text-xs">
                  {r.delta > 0 ? '+' : ''}
                  {r.delta.toFixed(1)} ulusaldan
                </Badge>
              </div>
              {r.strongestCity && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex justify-between">
                    <span>En guclu: {r.strongestCity.city}</span>
                    <span className="tabular-nums">%{r.strongestCity.pct.toFixed(1)}</span>
                  </div>
                  {r.weakestCity && r.weakestCity.city !== r.strongestCity.city && (
                    <div className="flex justify-between mt-0.5">
                      <span>En zayif: {r.weakestCity.city}</span>
                      <span className="tabular-nums">%{r.weakestCity.pct.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
