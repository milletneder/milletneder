'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ConfidenceIndicatorProps {
  overall: number;
  sampleSize: number;
  demographicBalance: number;
  geographicCoverage: number;
  fraudRate: number;
  marginOfError: number;
  effectiveSampleSize: number;
  totalSampleSize: number;
}

export default function ConfidenceIndicator({
  overall,
  sampleSize,
  demographicBalance,
  geographicCoverage,
  fraudRate,
  marginOfError,
  effectiveSampleSize,
  totalSampleSize,
}: ConfidenceIndicatorProps) {
  const getLevel = (score: number) => {
    if (score >= 70) return 'Yüksek';
    if (score >= 40) return 'Orta';
    return 'Düşük';
  };

  const factors = [
    {
      label: 'Örneklem büyüklüğü',
      value: sampleSize,
      desc: 'Toplam katılımcı sayısının istatistiksel yeterliliği',
    },
    {
      label: 'Demografik denge',
      value: demographicBalance,
      desc: 'Yaş, cinsiyet ve eğitim dağılımının Türkiye genelini yansıtma oranı',
    },
    {
      label: 'Coğrafi kapsam',
      value: geographicCoverage,
      desc: 'Kaç farklı ilden katılım olduğu',
    },
    {
      label: 'Veri temizliği',
      value: fraudRate,
      desc: 'Sahte hesap ve bot oranının düşüklüğü',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Güven Skoru</CardTitle>
          <Badge variant="secondary" className="tabular-nums">
            ±{marginOfError.toFixed(1)} puan
          </Badge>
        </div>
        <CardDescription>
          Sonuçların ne kadar güvenilir olduğunu gösteren bileşik skor. Katılımcı sayısı, demografik temsil, coğrafi çeşitlilik ve veri kalitesini birlikte değerlendirir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall score */}
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold tabular-nums">{overall.toFixed(0)}</span>
            <span className="text-xs text-muted-foreground">/100 — {getLevel(overall)}</span>
          </div>
          <Progress value={Math.min(100, overall)} className="h-3" />
        </div>

        {/* Factor breakdown */}
        <div className="space-y-4">
          {factors.map(f => (
            <div key={f.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium">{f.label}</span>
                <span className="text-xs font-bold tabular-nums">
                  {f.value.toFixed(0)}/100
                </span>
              </div>
              <Progress value={Math.min(100, f.value)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* Sample sizes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Ham örneklem</p>
            <p className="text-lg font-bold tabular-nums">{totalSampleSize.toLocaleString('tr-TR')}</p>
            <p className="text-xs text-muted-foreground">Toplam geçerli oy sayısı</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">Efektif örneklem</p>
            <p className="text-lg font-bold tabular-nums">{effectiveSampleSize.toLocaleString('tr-TR')}</p>
            <p className="text-xs text-muted-foreground">Ağırlıklandırma sonrası etkin sayı</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
