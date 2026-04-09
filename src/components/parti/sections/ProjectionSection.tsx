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

interface SeatProjection {
  partySlug: string;
  partyName: string;
  shortName: string;
  pollPct: number;
  projectedSeats: number;
  change: number;
}

interface ProjectionData {
  totalSeats: number;
  barajPct: number;
  projections: SeatProjection[];
  myParty: SeatProjection | null;
}

const chartConfig: ChartConfig = {
  projectedSeats: {
    label: 'Projeksiyon (Sandalye)',
    color: 'var(--color-neutral-900)',
  },
};

export function ProjectionSection() {
  const { apiGet, isReady } = useDashboard();
  const [data, setData] = useState<ProjectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    apiGet<{ projection: ProjectionData | null }>('/api/parti/dashboard', {
      include: 'projection',
    })
      .then((d) => setData(d.projection || null))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isReady, apiGet]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">
          {error || 'Projeksiyon verisi bulunamadi'}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Projeksiyon, D&apos;Hondt yontemiyle mevcut anket verilerinden hesaplanmaktadir.
        </p>
      </div>
    );
  }

  const chartData = data.projections
    .filter((p) => p.projectedSeats > 0)
    .sort((a, b) => b.projectedSeats - a.projectedSeats)
    .map((p) => ({
      name: p.shortName,
      projectedSeats: p.projectedSeats,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Milletvekili Projeksiyonu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          D&apos;Hondt yontemiyle {data.totalSeats} sandalyenin dagilimi. Baraj: %
          {data.barajPct}
        </p>
      </div>

      {data.myParty && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Partinizin Projeksiyonu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-3xl font-bold">{data.myParty.projectedSeats}</p>
                <p className="text-xs text-muted-foreground">sandalye</p>
              </div>
              <div>
                <p className="text-lg font-semibold">
                  %{data.myParty.pollPct.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">anket orani</p>
              </div>
              {data.myParty.change !== 0 && (
                <Badge variant="outline" className="text-xs">
                  {data.myParty.change > 0 ? '+' : ''}
                  {data.myParty.change} sandalye degisim
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sandalye Dagilimi</CardTitle>
          <CardDescription>Mevcut anket verilerine gore projeksiyon</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="projectedSeats" fill="var(--color-neutral-700)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tum Partiler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.projections
              .sort((a, b) => b.projectedSeats - a.projectedSeats)
              .map((p) => (
                <div
                  key={p.partySlug}
                  className="flex items-center justify-between py-1.5 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p.partyName}</span>
                    <span className="text-xs text-muted-foreground">
                      %{p.pollPct.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold tabular-nums">
                      {p.projectedSeats}
                    </span>
                    <span className="text-xs text-muted-foreground">sandalye</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
