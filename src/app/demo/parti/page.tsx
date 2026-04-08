'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { BarChart3, Hash, Users, TrendingUp, TrendingDown, Minus, Lock } from 'lucide-react';

interface DemoData {
  party: { name: string; short_name: string; color: string };
  currentPollPct: number;
  rank: number;
  totalParties: number;
  changeFromLastRound: number;
  totalVotes: number;
  cityCount: number;
  trendData: { round: string; pct: number }[];
  expiresAt: string;
}

const chartConfig: ChartConfig = {
  pct: {
    label: 'Oy Orani (%)',
    color: 'var(--color-neutral-900)',
  },
};

export default function DemoPartiPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Skeleton className="h-8 w-32" />
        </div>
      }
    >
      <DemoPartiContent />
    </Suspense>
  );
}

function DemoPartiContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const [data, setData] = useState<DemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tokenParam) {
      setError('Demo token belirtilmedi');
      setLoading(false);
      return;
    }

    fetch('/api/demo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenParam }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Gecersiz veya suresi dolmus demo link');
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tokenParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Lock className="h-12 w-12 text-neutral-300 mb-4" />
        <h1 className="text-xl font-bold mb-2">Demo Erisimi</h1>
        <p className="text-neutral-500 text-sm text-center max-w-md mb-6">
          {error || 'Bu demo linki gecersiz veya suresi dolmus.'}
        </p>
        <a href="mailto:iletisim@milletneder.com">
          <Button variant="outline">Iletisime Gecin</Button>
        </a>
      </div>
    );
  }

  const changeIcon =
    data.changeFromLastRound > 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : data.changeFromLastRound < 0 ? (
      <TrendingDown className="h-4 w-4" />
    ) : (
      <Minus className="h-4 w-4" />
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Demo header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">#milletneder</span>
            <Badge variant="outline" className="text-xs">Demo</Badge>
          </div>
          <span className="text-xs text-neutral-400">
            Gecerlilik: {new Date(data.expiresAt).toLocaleDateString('tr-TR')}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Party title */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{data.party.name}</h1>
          <Badge variant="outline">{data.party.short_name}</Badge>
          <Badge variant="outline" className="text-xs">Demo</Badge>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Anket Orani</CardTitle>
              <BarChart3 className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">%{data.currentPollPct.toFixed(1)}</div>
              <div className="flex items-center gap-1 text-xs text-neutral-500 mt-1">
                {changeIcon}
                <span>
                  {data.changeFromLastRound > 0 ? '+' : ''}
                  {data.changeFromLastRound.toFixed(1)} puan
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Siralama</CardTitle>
              <Hash className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.rank}.</div>
              <p className="text-xs text-neutral-500 mt-1">{data.totalParties} parti icinde</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Toplam Oy</CardTitle>
              <Users className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalVotes.toLocaleString('tr-TR')}</div>
              <p className="text-xs text-neutral-500 mt-1">Aktif turda</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Il Sayisi</CardTitle>
              <BarChart3 className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.cityCount}</div>
              <p className="text-xs text-neutral-500 mt-1">Oy alinan il</p>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        {data.trendData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performans Trendi</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                  <XAxis dataKey="round" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v: number) => `%${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="pct"
                    stroke="var(--color-neutral-900)"
                    fill="var(--color-neutral-200)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-8">
            <Lock className="h-8 w-8 text-neutral-300 mb-3" />
            <h3 className="text-lg font-semibold mb-1">Tam Panele Erisin</h3>
            <p className="text-sm text-neutral-500 text-center max-w-md mb-4">
              Rakip karsilastirma, secmen profili, kayip/kazanc matrisi, milletvekili projeksiyonu ve
              daha fazlasina erisim icin parti aboneligi alin.
            </p>
            <a href="mailto:iletisim@milletneder.com">
              <Button>Bu panele abone olmak icin iletisime gecin</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
