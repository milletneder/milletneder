'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface PartyOption {
  slug: string;
  name: string;
  short_name: string;
}

interface ComparisonData {
  party: PartyOption;
  pollPct: number;
  rank: number;
  leadingCities: number;
  totalVotes: number;
}

const chartConfig: ChartConfig = {
  pollPct: {
    label: 'Oy Orani (%)',
    color: 'var(--color-neutral-900)',
  },
};

export default function RakiplerPage() {
  const { token } = useAuth();
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [rivals, setRivals] = useState<string[]>([]);
  const [data, setData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  // Fetch available parties
  useEffect(() => {
    if (!token) return;
    fetch('/api/parti/competitors?list=true', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((d) => {
        if (d.parties) setParties(d.parties);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const fetchComparison = useCallback(async () => {
    if (!token || rivals.length === 0) return;
    setComparing(true);
    try {
      const res = await fetch(`/api/parti/competitors?rivals=${rivals.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d.comparison || []);
      }
    } catch {
      // silent
    } finally {
      setComparing(false);
    }
  }, [token, rivals]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  function addRival(slug: string) {
    if (rivals.length >= 3 || rivals.includes(slug)) return;
    setRivals((prev) => [...prev, slug]);
  }

  function removeRival(slug: string) {
    setRivals((prev) => prev.filter((s) => s !== slug));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.party.short_name,
    pollPct: d.pollPct,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Rakip Karsilastirma</h1>

      {/* Rival selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rakip Sec (en fazla 3)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select onValueChange={addRival}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Parti sec..." />
            </SelectTrigger>
            <SelectContent>
              {parties.map((p) => (
                <SelectItem key={p.slug} value={p.slug} disabled={rivals.includes(p.slug)}>
                  {p.name} ({p.short_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {rivals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rivals.map((slug) => {
                const p = parties.find((x) => x.slug === slug);
                return (
                  <Badge
                    key={slug}
                    variant="outline"
                    className="cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    onClick={() => removeRival(slug)}
                  >
                    {p?.short_name || slug} &times;
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison table */}
      {comparing ? (
        <Skeleton className="h-48" />
      ) : data.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Karsilastirma Tablosu</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parti</TableHead>
                    <TableHead className="text-right">Oy Orani</TableHead>
                    <TableHead className="text-right">Siralama</TableHead>
                    <TableHead className="text-right">Onde Oldugu Il</TableHead>
                    <TableHead className="text-right">Toplam Oy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.party.slug}>
                      <TableCell className="font-medium">
                        {row.party.name}
                        <span className="ml-1.5 text-neutral-400 text-xs">({row.party.short_name})</span>
                      </TableCell>
                      <TableCell className="text-right">%{row.pollPct.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{row.rank}.</TableCell>
                      <TableCell className="text-right">{row.leadingCities}</TableCell>
                      <TableCell className="text-right">{row.totalVotes.toLocaleString('tr-TR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Oy Orani Karsilastirmasi</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" tickFormatter={(v: number) => `%${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="pollPct" fill="var(--color-neutral-700)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      ) : rivals.length > 0 ? (
        <p className="text-sm text-neutral-500">Karsilastirma verisi bulunamadi.</p>
      ) : null}
    </div>
  );
}
