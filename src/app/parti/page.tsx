'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Hash, BarChart3, Users } from 'lucide-react';

interface DashboardData {
  party: { id: number; name: string; short_name: string; slug: string; color: string };
  currentPollPct: number;
  rank: number;
  totalParties: number;
  changeFromLastRound: number;
  totalVotes: number;
  cityCount: number;
  trendData: { round: string; pct: number }[];
}

const chartConfig: ChartConfig = {
  pct: {
    label: 'Oy Orani (%)',
    color: 'var(--color-neutral-900)',
  },
};

export default function PartiDashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/parti/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Veri alinamadi');
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
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
        <p className="text-neutral-500 text-sm">{error || 'Veri bulunamadi'}</p>
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
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{data.party.name}</h1>
        <Badge variant="outline">{data.party.short_name}</Badge>
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
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                <XAxis
                  dataKey="round"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
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
