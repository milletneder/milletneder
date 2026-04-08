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

const DIMENSION_LABELS: Record<string, string> = {
  age_bracket: 'Yas Grubu',
  gender: 'Cinsiyet',
  education: 'Egitim',
  income_bracket: 'Gelir',
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  age_bracket: { '1': '18-24', '2': '25-34', '3': '35-44', '4': '45-54', '5': '55-64', '6': '65+' },
  gender: { M: 'Erkek', F: 'Kadin' },
  education: { '1': 'Ilkokul', '2': 'Ortaokul', '3': 'Lise', '4': 'Universite', '5': 'Lisansustu' },
  income_bracket: { '1': 'Dusuk', '2': 'Orta-Alt', '3': 'Orta', '4': 'Orta-Ust', '5': 'Yuksek' },
};

export default function SecmenProfiliPage() {
  const { token } = useAuth();
  const [data, setData] = useState<VoterProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/parti/voter-profile', {
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
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Secmen Profili</h1>
        <Badge variant="outline">{data.partyName}</Badge>
      </div>

      <p className="text-sm text-neutral-500">
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
                    <TableCell className="text-right">{cat.count.toLocaleString('tr-TR')}</TableCell>
                    <TableCell className="text-right">%{cat.pct.toFixed(1)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-1 max-w-48">
                          <div
                            className="h-full rounded-full bg-neutral-800 dark:bg-neutral-200"
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
