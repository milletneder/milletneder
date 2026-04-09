'use client';

import { useState, useEffect } from 'react';
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
import { useDashboard } from '../PartyDashboardProvider';

interface DemographicBreakdown {
  dimension: string;
  label: string;
  categories: { category: string; label: string; count: number; pct: number }[];
}

interface VoterProfileData {
  partyName: string;
  totalVoters: number;
  demographics: DemographicBreakdown[];
}

export function VoterProfileSection() {
  const { apiGet, isReady } = useDashboard();
  const [data, setData] = useState<VoterProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    apiGet<VoterProfileData>('/api/parti/voter-profile')
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isReady, apiGet]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Secmen Profili</h1>
        <Badge variant="outline">{data.partyName}</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Toplam {data.totalVoters.toLocaleString('tr-TR')} secmen uzerinden demografik kirilim.
      </p>

      {data.demographics.map((dim) => (
        <Card key={dim.dimension}>
          <CardHeader>
            <CardTitle className="text-base">{dim.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dim.label}</TableHead>
                  <TableHead className="text-right">Sayi</TableHead>
                  <TableHead className="text-right">Oran</TableHead>
                  <TableHead>Dagilim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dim.categories.map((cat) => (
                  <TableRow key={cat.category}>
                    <TableCell className="font-medium">{cat.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cat.count.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      %{cat.pct.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-full bg-muted flex-1 max-w-48">
                          <div
                            className="h-full rounded-full bg-foreground"
                            style={{ width: `${Math.min(cat.pct, 100)}%` }}
                          />
                        </div>
                      </div>
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
