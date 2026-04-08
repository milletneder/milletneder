'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

interface FlowEntry {
  fromParty: string;
  fromPartyName: string;
  toParty: string;
  toPartyName: string;
  count: number;
  pct: number;
}

interface LossGainData {
  partyName: string;
  partySlug: string;
  gained: FlowEntry[];
  lost: FlowEntry[];
  netChange: number;
  totalGained: number;
  totalLost: number;
}

export default function KayipKazancPage() {
  const { token } = useAuth();
  const [data, setData] = useState<LossGainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/parti/dashboard?include=lossGain', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Veri alinamadi');
        return res.json();
      })
      .then((d) => setData(d.lossGain || null))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-neutral-500 text-sm">{error || 'Kayip/kazanc verisi bulunamadi'}</p>
        <p className="text-xs text-neutral-400 mt-2">
          Bu veri, secmenlerin 2023 secimindeki tercihlerine dayanmaktadir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Kayip / Kazanc Matrisi</h1>
        <Badge variant="outline">{data.partyName}</Badge>
      </div>

      <p className="text-sm text-neutral-500">
        2023 seciminden bu tura geciste secmen akisi. Secmenlerin beyan ettigi onceki oy tercihine dayanmaktadir.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Kazanilan</CardTitle>
            <TrendingUp className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalGained.toLocaleString('tr-TR')}</div>
            <p className="text-xs text-neutral-500 mt-1">secmen diger partilerden geldi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Kaybedilen</CardTitle>
            <TrendingDown className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalLost.toLocaleString('tr-TR')}</div>
            <p className="text-xs text-neutral-500 mt-1">secmen diger partilere gitti</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Net Degisim</CardTitle>
            <ArrowRight className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.netChange > 0 ? '+' : ''}
              {data.netChange.toLocaleString('tr-TR')}
            </div>
            <p className="text-xs text-neutral-500 mt-1">secmen fark</p>
          </CardContent>
        </Card>
      </div>

      {/* Flow tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gained */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kazanilan Secmenler</CardTitle>
          </CardHeader>
          <CardContent>
            {data.gained.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Geldi: Parti</TableHead>
                    <TableHead className="text-right">Sayi</TableHead>
                    <TableHead className="text-right">Oran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.gained.map((row) => (
                    <TableRow key={row.fromParty}>
                      <TableCell className="font-medium">{row.fromPartyName}</TableCell>
                      <TableCell className="text-right">{row.count.toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="text-right">%{row.pct.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-neutral-400">Veri bulunamadi</p>
            )}
          </CardContent>
        </Card>

        {/* Lost */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kaybedilen Secmenler</CardTitle>
          </CardHeader>
          <CardContent>
            {data.lost.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gitti: Parti</TableHead>
                    <TableHead className="text-right">Sayi</TableHead>
                    <TableHead className="text-right">Oran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lost.map((row) => (
                    <TableRow key={row.toParty}>
                      <TableCell className="font-medium">{row.toPartyName}</TableCell>
                      <TableCell className="text-right">{row.count.toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="text-right">%{row.pct.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-neutral-400">Veri bulunamadi</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
