'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  GitCompareArrows,
  Target,
  Swords,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { useDashboard } from '../PartyDashboardProvider';

type InsightType = 'loss' | 'gain' | 'comparison' | 'swing' | 'rival' | 'data_quality';
type Priority = 'high' | 'medium' | 'low';

interface Insight {
  id: string;
  type: InsightType;
  priority: Priority;
  title: string;
  description: string;
  value?: number;
  link?: string;
}

interface InsightsResponse {
  partyName: string;
  partyShortName: string;
  generatedAt: string;
  total: number;
  insights: Insight[];
}

const TYPE_ICONS: Record<InsightType, React.ComponentType<{ className?: string }>> = {
  loss: TrendingDown,
  gain: TrendingUp,
  comparison: GitCompareArrows,
  swing: Target,
  rival: Swords,
  data_quality: ShieldAlert,
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Yuksek',
  medium: 'Orta',
  low: 'Dusuk',
};

export function InsightsSection() {
  const { apiGet, isReady } = useDashboard();
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    apiGet<InsightsResponse>('/api/parti/insights')
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isReady, apiGet]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Uyarilar ve Icgoruler</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data.partyName} icin kural tabanli uyari ve firsat listesi. Oncelik sirasina gore.
        </p>
      </div>

      {data.insights.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Henuz bir icgoru bulunmuyor. Daha fazla veri biriktikce burada onemli degisimler
            listelenecek.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.insights.map((ins) => {
            const Icon = TYPE_ICONS[ins.type] || ShieldAlert;
            return (
              <Card key={ins.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-md border flex items-center justify-center bg-muted/30">
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm font-semibold">
                          {ins.title}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px]">
                          {PRIORITY_LABELS[ins.priority]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {ins.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                {ins.link && (
                  <CardContent className="pt-0">
                    <Link
                      href={ins.link}
                      className="text-xs text-foreground hover:underline inline-flex items-center gap-1"
                    >
                      Detaya git <ExternalLink className="size-3" />
                    </Link>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
