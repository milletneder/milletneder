'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight } from 'lucide-react';

interface TransparencyData {
  totalVotes: number;
  flaggedAccounts: number;
  invalidVotes: number;
  cleanVotePercentage: number;
  invalidByParty: { party: string; count: number; color: string }[];
  weighting?: {
    activeMethods: string[];
    effectiveSampleSize: number;
    sampleSize: number;
    confidence?: { overall: number; marginOfError: number };
  };
}

interface TransparencyReportProps {
  data: TransparencyData;
  selectedCity?: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  post_stratification: 'Post-Stratification',
  raking: 'Raking (IPF)',
  turnout: 'Katılım Niyeti',
  recency: 'Zaman Ağırlığı',
  bayesian: 'Bayesian Düzeltme',
  partisan_bias: 'Partizan Sapma',
  regional_quota: 'Bölgesel Kota',
  fraud_detection: 'Sahtecilik Tespiti',
  weight_cap: 'Ağırlık Sınırı',
};

export default function TransparencyReport({ data, selectedCity }: TransparencyReportProps) {
  const stats = [
    { label: 'Toplam Oy', value: (data.totalVotes ?? 0).toLocaleString('tr-TR'), href: '/islemler?type=OY_KULLANIM' },
    { label: 'Şüpheli Hesap', value: (data.flaggedAccounts ?? 0).toLocaleString('tr-TR'), href: '/islemler?status=flagged' },
    { label: 'Geçersiz Oy', value: (data.invalidVotes ?? 0).toLocaleString('tr-TR'), href: '/islemler?status=invalid' },
    { label: 'Temiz Oy Oranı', value: `%${(data.cleanVotePercentage ?? 100).toFixed(1)}`, href: null },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {selectedCity ? `${selectedCity} — Şeffaflık Raporu` : 'Şeffaflık Raporu'}
        </CardTitle>
        <CardDescription>
          {selectedCity
            ? `${selectedCity} iline ait veriler. Tüm veriler açık, manipülasyon gizlenmez.`
            : 'Tüm veriler açık, manipülasyon gizlenmez — sergilenir.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, index) => {
            const content = (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-muted/50 rounded-lg p-4 text-center ${stat.href ? 'hover:bg-muted transition-colors cursor-pointer group' : ''}`}
              >
                <div className="text-2xl font-bold tabular-nums">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-xs mt-1 flex items-center justify-center gap-1">
                  {stat.label}
                  {stat.href && (
                    <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </motion.div>
            );

            if (stat.href) {
              return (
                <Link key={stat.label} href={stat.href}>
                  {content}
                </Link>
              );
            }
            return <div key={stat.label}>{content}</div>;
          })}
        </div>

        {data.invalidByParty.length > 0 && (
          <div>
            <h3 className="text-xs text-muted-foreground mb-3">
              Geçersiz Oyların Parti Dağılımı (Anonim)
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.invalidByParty.map((item) => (
                <Link
                  key={item.party}
                  href={`/islemler?status=invalid&party=${encodeURIComponent(item.party)}`}
                  className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer group"
                >
                  <div
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs">{item.party}</span>
                  <span className="text-muted-foreground text-xs">({item.count})</span>
                  <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {data.weighting && data.weighting.activeMethods.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs text-muted-foreground mb-3">Aktif Ağırlıklandırma Yöntemleri</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {data.weighting.activeMethods.map((method) => (
                  <Badge key={method} variant="outline">
                    {METHOD_LABELS[method] || method}
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Efektif Örneklem</p>
                  <p className="text-sm font-bold tabular-nums">{data.weighting.effectiveSampleSize.toLocaleString('tr-TR')}</p>
                </div>
                {data.weighting.confidence && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Hata Payı</p>
                    <p className="text-sm font-bold tabular-nums">±{data.weighting.confidence.marginOfError.toFixed(1)} puan</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                Sonuçlar yaş, cinsiyet, eğitim ve bölge dağılımına göre ağırlıklandırılır.
                Oy kullanma niyeti düşük olan katılımcılar daha az ağırlık alır.
                Şüpheli hesaplar otomatik tespit edilerek sonuçlardan çıkarılır.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
