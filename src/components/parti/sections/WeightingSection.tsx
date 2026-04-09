'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
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
import { Loader2, RefreshCw, Play } from 'lucide-react';
import { useDashboard } from '../PartyDashboardProvider';
import type { WeightingConfig, WeightedResults } from '@/lib/weighting/types';

interface ToggleableConfig {
  raking: boolean;
  postStratification: boolean;
  turnout: boolean;
  recency: boolean;
  partisanBias: boolean;
  regionalQuota: boolean;
  fraudDetection: boolean;
  bayesian: boolean;
  // Parametre slider'lari
  recencyLambda: number;
  weightCapMin: number;
  weightCapMax: number;
}

const DEFAULT_TOGGLES: ToggleableConfig = {
  raking: true,
  postStratification: false,
  turnout: true,
  recency: true,
  partisanBias: true,
  regionalQuota: false,
  fraudDetection: true,
  bayesian: false,
  recencyLambda: 0.01,
  weightCapMin: 0.4,
  weightCapMax: 2.5,
};

const METHOD_INFO: Array<{
  key: keyof Omit<ToggleableConfig, 'recencyLambda' | 'weightCapMin' | 'weightCapMax'>;
  label: string;
  description: string;
}> = [
  { key: 'raking', label: 'Raking (IPF)', description: 'Demografik boyutlarda iteratif orantili uydurma (yas, cinsiyet, egitim, bolge)' },
  { key: 'postStratification', label: 'Post-Stratification', description: 'Tek-boyutlu demografik duzeltme (Raking ile birlikte kullanilmaz)' },
  { key: 'turnout', label: 'Katilim Agirligi', description: 'Secime katilim niyetine gore agirlik (kesin gider=1, gitmeyecek=0.25)' },
  { key: 'recency', label: 'Yeni Oy Oncelik', description: 'Eski oylari exponential decay ile zayiflatir' },
  { key: 'partisanBias', label: 'Partizan Sapma Duzeltme', description: '2023 secim sonuclariyla orneklem sapmasini duzeltir' },
  { key: 'regionalQuota', label: 'Bolgesel Kota', description: 'Bolge bazli nufus payiyla hizalar (Raking ile birlikte gereksiz)' },
  { key: 'fraudDetection', label: 'Sahtecilik Filtresi', description: 'Yuksek skor oylari sifirlar, orta skorları cezalandirir' },
  { key: 'bayesian', label: 'Bayesian Smoothing', description: 'Kucuk orneklem icin onceliksel yumusatma (henuz aktif degil)' },
];

export function WeightingSection() {
  const { apiPost, isReady } = useDashboard();
  const [toggles, setToggles] = useState<ToggleableConfig>(DEFAULT_TOGGLES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    default: WeightedResults;
    preview: WeightedResults;
    deltas: Array<{ party: string; defaultPct: number; previewPct: number; delta: number }>;
  } | null>(null);

  function updateToggle<K extends keyof ToggleableConfig>(key: K, value: ToggleableConfig[K]) {
    setToggles((prev) => ({ ...prev, [key]: value }));
  }

  function resetToDefaults() {
    setToggles(DEFAULT_TOGGLES);
    setResult(null);
  }

  async function runPreview() {
    if (!isReady) return;
    setLoading(true);
    setError('');
    try {
      const config: Partial<WeightingConfig> = {
        raking: {
          enabled: toggles.raking,
          dimensions: ['age', 'gender', 'region', 'education'],
          maxIterations: 50,
          convergenceThreshold: 0.001,
        },
        postStratification: {
          enabled: toggles.postStratification,
          dimensions: ['age', 'gender', 'region'],
        },
        turnout: {
          enabled: toggles.turnout,
          weights: { T1: 1, T2: 0.6, T3: 0.3, T4: 0.25 },
        },
        recency: {
          enabled: toggles.recency,
          lambda: toggles.recencyLambda,
        },
        partisanBias: { enabled: toggles.partisanBias },
        regionalQuota: { enabled: toggles.regionalQuota },
        fraudDetection: { enabled: toggles.fraudDetection, threshold: 80 },
        bayesian: { enabled: toggles.bayesian, minSampleSize: 30, priorStrength: 10 },
        weightCap: { min: toggles.weightCapMin, max: toggles.weightCapMax },
      };

      const response = await apiPost<{
        default: WeightedResults;
        preview: WeightedResults;
        deltas: Array<{ party: string; defaultPct: number; previewPct: number; delta: number }>;
      }>('/api/parti/weighting-preview', { config });
      setResult(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir hata olustu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agirliklandirma Oynatma Alani</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Metodlari ac/kapa, parametreleri degistir, sonuclari onizle. Bu degisiklik gercek sonuclari etkilemez.
        </p>
      </div>

      {/* Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metodlar</CardTitle>
          <CardDescription>9 farkli agirliklandirma metodu — her biri bagimsiz ac/kapa edilebilir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {METHOD_INFO.map((m) => (
            <div key={m.key} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
              <div className="flex-1 min-w-0">
                <Label htmlFor={`toggle-${m.key}`} className="font-medium text-sm">
                  {m.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
              </div>
              <Switch
                id={`toggle-${m.key}`}
                checked={toggles[m.key] as boolean}
                onCheckedChange={(v) => updateToggle(m.key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parametreler</CardTitle>
          <CardDescription>Ince ayarlar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Recency Lambda (decay hizi)</Label>
              <Badge variant="outline" className="tabular-nums">{toggles.recencyLambda.toFixed(3)}</Badge>
            </div>
            <Slider
              min={0.001}
              max={0.05}
              step={0.001}
              value={[toggles.recencyLambda]}
              onValueChange={([v]) => updateToggle('recencyLambda', v)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Kucuk = eski oylar daha az zayiflar, buyuk = daha hizli unutulur. 0.01 (varsayilan): 30 gun = %74
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Agirlik Alt Limit (min)</Label>
              <Badge variant="outline" className="tabular-nums">{toggles.weightCapMin.toFixed(2)}</Badge>
            </div>
            <Slider
              min={0.1}
              max={1}
              step={0.05}
              value={[toggles.weightCapMin]}
              onValueChange={([v]) => updateToggle('weightCapMin', v)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Agirlik Ust Limit (max)</Label>
              <Badge variant="outline" className="tabular-nums">{toggles.weightCapMax.toFixed(2)}</Badge>
            </div>
            <Slider
              min={1}
              max={5}
              step={0.05}
              value={[toggles.weightCapMax]}
              onValueChange={([v]) => updateToggle('weightCapMax', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={runPreview} disabled={loading || !isReady}>
          {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
          Onizle
        </Button>
        <Button variant="outline" onClick={resetToDefaults}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Varsayilani Geri Yukle
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>

      {/* Results */}
      {loading && <Skeleton className="h-64" />}

      {result && !loading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sonuc Karsilastirmasi</CardTitle>
              <CardDescription>
                Varsayilan aktif metodlar: <strong>{result.default.methodology.join(', ') || '-'}</strong>
                {' '}| Onizleme aktif metodlar: <strong>{result.preview.methodology.join(', ') || '-'}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-md border p-4">
                  <p className="text-xs text-muted-foreground">Varsayilan Guven</p>
                  <p className="text-2xl font-bold">%{(result.default.confidence.overall * 100).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Etkili orneklem: {result.default.effectiveSampleSize.toLocaleString('tr-TR')}
                  </p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-xs text-muted-foreground">Onizleme Guven</p>
                  <p className="text-2xl font-bold">%{(result.preview.confidence.overall * 100).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Etkili orneklem: {result.preview.effectiveSampleSize.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parti</TableHead>
                    <TableHead className="text-right">Varsayilan</TableHead>
                    <TableHead className="text-right">Onizleme</TableHead>
                    <TableHead className="text-right">Fark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.deltas.slice(0, 12).map((d) => (
                    <TableRow key={d.party}>
                      <TableCell className="font-medium">{d.party}</TableCell>
                      <TableCell className="text-right tabular-nums">%{d.defaultPct.toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums">%{d.previewPct.toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Badge variant="outline" className="tabular-nums">
                          {d.delta > 0 ? '+' : ''}
                          {d.delta.toFixed(2)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
