'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import TurkeyMap, { type CityResult, type DistrictData } from '@/components/map/TurkeyMap';
import { useDashboard } from '../PartyDashboardProvider';

type ViewMode = 'absolute' | 'strength' | 'weakness' | 'trend';

interface MapResponse {
  party: {
    id: number;
    name: string;
    short_name: string;
    slug: string;
    color: string;
  };
  view: ViewMode;
  nationalPct: number;
  cities: Array<CityResult & {
    partyPct: number;
    partyDelta: number;
    partyTrendDelta: number;
    metricLabel: string;
  }>;
}

const VIEW_LABELS: Record<ViewMode, { title: string; description: string }> = {
  absolute: {
    title: 'İl Liderleri',
    description: 'Her ildeki en çok oy alan parti (standart harita)',
  },
  strength: {
    title: 'Partinin Gücü',
    description: 'Partinin şehirdeki yüzdesi — koyu renk yüksek oran',
  },
  weakness: {
    title: 'Zayıflık Haritası',
    description: 'Ulusal ortalamadan aşağıda kalan şehirler — koyu renk büyük fark',
  },
  trend: {
    title: 'Trend (Tur Farkı)',
    description: 'Önceki turdan bu tura yüzde puan değişimi',
  },
};

export function MapSection() {
  const { apiGet, isReady, partyInfo } = useDashboard();
  const [view, setView] = useState<ViewMode>('strength');
  const [data, setData] = useState<MapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!isReady) return;
    setLoading(true);
    apiGet<MapResponse>('/api/parti/map', { view })
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isReady, apiGet, view]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCityClick = useCallback((cityId: string) => {
    setSelectedCity(cityId);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedCity(null);
  }, []);

  const handleDistrictsLoaded = useCallback((_: DistrictData[]) => {
    // No-op for now; TurkeyMap kendi ilçe görünümünü yönetir
  }, []);

  const info = VIEW_LABELS[view];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coğrafi Performans</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-1">
              {data.party.name} ({data.party.short_name}) — Ulusal ortalama:{' '}
              <strong>%{data.nationalPct.toFixed(1)}</strong>
            </p>
          )}
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="strength">Güç</TabsTrigger>
            <TabsTrigger value="weakness">Zayıflık</TabsTrigger>
            <TabsTrigger value="trend">Trend</TabsTrigger>
            <TabsTrigger value="absolute">Liderler</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">{info.title}</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </div>
            {partyInfo?.color && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{ borderColor: partyInfo.color, color: partyInfo.color }}
              >
                {partyInfo.short_name}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="aspect-[5/3] md:aspect-[16/9] flex items-center justify-center bg-muted/30">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ) : error ? (
            <div className="aspect-[5/3] md:aspect-[16/9] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : data ? (
            <div className="aspect-[5/3] md:aspect-[16/9] relative">
              <TurkeyMap
                cityData={data.cities}
                isActiveRound={true}
                selectedCity={selectedCity}
                onCityClick={handleCityClick}
                onBack={handleBack}
                onDistrictsLoaded={handleDistrictsLoaded}
                showPartyColors={view === 'absolute'}
                isLoggedIn={true}
                viewMode="il"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Top/Bottom summary */}
      {data && data.cities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">En Güçlü 10 İl</CardTitle>
              <CardDescription>Partinin en yüksek oy oranı aldığı iller</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1.5">
                {[...data.cities]
                  .sort((a, b) => (b.partyPct ?? 0) - (a.partyPct ?? 0))
                  .slice(0, 10)
                  .map((c, idx) => (
                    <li
                      key={c.cityName}
                      className="flex items-center justify-between text-sm border-b last:border-0 py-1.5"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                        <span className="font-medium">{c.cityName}</span>
                      </span>
                      <span className="tabular-nums font-semibold">%{c.partyPct.toFixed(1)}</span>
                    </li>
                  ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">En Zayıf 10 İl</CardTitle>
              <CardDescription>Partinin en düşük oy oranı aldığı iller</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1.5">
                {[...data.cities]
                  .sort((a, b) => (a.partyPct ?? 0) - (b.partyPct ?? 0))
                  .slice(0, 10)
                  .map((c, idx) => (
                    <li
                      key={c.cityName}
                      className="flex items-center justify-between text-sm border-b last:border-0 py-1.5"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                        <span className="font-medium">{c.cityName}</span>
                      </span>
                      <span className="tabular-nums font-semibold text-muted-foreground">
                        %{c.partyPct.toFixed(1)}
                      </span>
                    </li>
                  ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
