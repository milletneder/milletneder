'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Hash,
  BarChart3,
  Users,
  Info,
  CalendarRange,
} from 'lucide-react';
import { useDashboard } from '../PartyDashboardProvider';

type RoundScope = 'active' | 'last_published' | 'last_3' | 'all';

interface DashboardData {
  party: { id: number; name: string; short_name: string; slug: string; color: string };
  scope: {
    key: RoundScope;
    label: string;
    description: string;
    roundIds: number[];
  };
  currentPollPct: number;
  rank: number;
  totalParties: number;
  changeFromLastRound: number;
  comparisonSmallSample: boolean;
  totalVotes: number;
  cityCount: number;
  trendData: { round: string; pct: number; sample: number }[];
}

const chartConfig: ChartConfig = {
  pct: {
    label: 'Oy Orani (%)',
    color: 'var(--color-neutral-900)',
  },
};

const SCOPE_OPTIONS: Array<{ value: RoundScope; label: string; description: string }> = [
  { value: 'active', label: 'Aktif Tur', description: 'Su anda devam eden tur' },
  { value: 'last_published', label: 'Son Yayinlanan Tur', description: 'Tamamlanmis son tur' },
  { value: 'last_3', label: 'Son 3 Tur', description: 'Aktif + son 2 tur birlikte' },
  { value: 'all', label: 'Tum Zamanlar', description: 'Tum yayinlanmis turlar' },
];

export function OverviewSection() {
  const { apiGet, setPartyInfo, isReady } = useDashboard();
  const [scope, setScope] = useState<RoundScope>('active');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    apiGet<DashboardData>('/api/parti/dashboard', { roundScope: scope })
      .then((d) => {
        setData(d);
        setPartyInfo({
          id: d.party.id,
          name: d.party.name,
          short_name: d.party.short_name,
          slug: d.party.slug,
          color: d.party.color,
        });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isReady, scope, apiGet, setPartyInfo]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
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

  const changeIcon =
    data.changeFromLastRound > 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : data.changeFromLastRound < 0 ? (
      <TrendingDown className="h-4 w-4" />
    ) : (
      <Minus className="h-4 w-4" />
    );

  const scopeMeta = SCOPE_OPTIONS.find((o) => o.value === scope);

  return (
    <div className="space-y-6">
      {/* Header + Date Filter */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{data.party.name}</h1>
            <Badge variant="outline">{data.party.short_name}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.scope.label} · {data.scope.description}
          </p>
        </div>

        {/* Date / Scope filter */}
        <Select value={scope} onValueChange={(v) => setScope(v as RoundScope)}>
          <SelectTrigger className="w-auto min-w-[200px]">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Donem" />
            </div>
          </SelectTrigger>
          <SelectContent align="end">
            {SCOPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <div className="flex flex-col">
                  <span className="text-sm">{o.label}</span>
                  <span className="text-[10px] text-muted-foreground">{o.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Small-sample warning */}
      {data.comparisonSmallSample && scope === 'active' && (
        <div className="rounded-md border border-border bg-muted/30 p-3 flex items-start gap-2.5 text-xs">
          <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">Az orneklemli karsilastirma</p>
            <p className="text-muted-foreground mt-0.5">
              Karsilastirilan turlarin orneklemi 100 oydan az. Puan degisim rakamlari
              istatistiksel olarak guvensiz olabilir.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {scope === 'active' ? 'Anket Orani' : 'Oy Orani'}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">%{data.currentPollPct.toFixed(1)}</div>
            {scope === 'active' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                {changeIcon}
                <span>
                  {data.changeFromLastRound > 0 ? '+' : ''}
                  {data.changeFromLastRound.toFixed(1)} puan
                </span>
                {data.comparisonSmallSample && (
                  <Info className="size-3 ml-1" aria-label="Kucuk orneklem" />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Siralama</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.rank}.</div>
            <p className="text-xs text-muted-foreground mt-1">{data.totalParties} parti icinde</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Oy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalVotes.toLocaleString('tr-TR')}</div>
            <p className="text-xs text-muted-foreground mt-1">{scopeMeta?.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Il Sayisi</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.cityCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Oy alinan il</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      {data.trendData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performans Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="round" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                  tickFormatter={(v: number) => `%${v}`}
                />
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
    </div>
  );
}
