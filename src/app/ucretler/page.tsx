'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Check } from 'lucide-react';

const VATANDAS_FEATURES = [
  'Aylık raporlara anında erişim',
  'İl kırılımı — ilçe bazlı parti dağılımı',
  'İlçe bazlı sıralama ve karşılaştırma',
  'İl bazlı aylık trend grafiği',
];

const ARASTIRMACI_FEATURES = [
  'Vatandaş paketindeki her şey',
  'API erişimi (JSON)',
  'CSV/Excel export',
  'Çapraz tablo oluşturucu',
  'Tüm turların tam arşivi',
  'Trend grafiği oluşturucu',
  'Embed widget',
  'Ağırlıklandırma şeffaflığı',
  'Haftalık analiz e-postası',
];

const PARTI_FEATURES = [
  'Araştırmacı paketindeki her şey',
  'Parti odaklı canlı dashboard',
  'Rakip karşılaştırma paneli',
  'Seçmen profil analizi',
  'Kayıp/kazanç matrisi',
  'Coğrafi performans haritası',
  'Swing seçmen analizi',
  'Milletvekili projeksiyonu (D\'Hondt)',
  'Bölgesel erken uyarı',
  'White-label PDF rapor',
  'Aylık 2 özel rapor',
];

const UCRETSIZ_FEATURES = [
  'Ulusal sonuçlar (ham + ağırlıklı)',
  'Haritada parti renkleri',
  'Güven skoru ve şeffaflık raporu',
  'Demografik karşılaştırmalar',
  'Katılım sıralaması',
  'Oy geçmişi ve profil',
  'Aylık raporlar (1 ay gecikmeli)',
];

function fmt(n: number) {
  return n.toLocaleString('tr-TR');
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-2">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
          <Check className="size-3.5 shrink-0 mt-0.5 text-foreground" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

export default function UcretlerPage() {
  const [yearly, setYearly] = useState(false);
  const [members, setMembers] = useState(500000);

  const partyPrice = members < 100000 ? 1000 : Math.round(members * 0.01);

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        {/* Hero */}
        <div className="pt-16 pb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Ücretler</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Bağımsız ve şeffaf seçim verisine erişim. İhtiyacınıza uygun planı seçin.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm ${!yearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              Aylık
            </span>
            <Switch checked={yearly} onCheckedChange={setYearly} />
            <span className={`text-sm ${yearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              Yıllık
            </span>
            {yearly && <Badge variant="outline">Tasarruf</Badge>}
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-16">

          {/* Vatandaş */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-semibold">Vatandaş</p>
              <div className="mt-4 mb-1">
                <span className="text-3xl font-bold tabular-nums">
                  ₺{yearly ? '999' : '99'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {yearly ? ' /yıl' : ' /ay'}
                </span>
              </div>
              {yearly && (
                <p className="text-xs text-muted-foreground mb-4">₺83/ay — yılda ₺189 tasarruf</p>
              )}
              {!yearly && (
                <p className="text-xs text-muted-foreground mb-4">İl/ilçe kırılımları ve raporlara anında erişim</p>
              )}
              <Button variant="outline" className="w-full mb-6">Başla</Button>
              <FeatureList features={VATANDAS_FEATURES} />
            </CardContent>
          </Card>

          {/* Araştırmacı */}
          <Card className="ring-2 ring-foreground">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Araştırmacı</p>
                <Badge>Popüler</Badge>
              </div>
              <div className="mt-4 mb-1">
                <span className="text-3xl font-bold tabular-nums">
                  ₺{yearly ? '4.999' : '499'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {yearly ? ' /yıl' : ' /ay'}
                </span>
              </div>
              {yearly && (
                <p className="text-xs text-muted-foreground mb-4">₺417/ay — yılda ₺989 tasarruf</p>
              )}
              {!yearly && (
                <p className="text-xs text-muted-foreground mb-4">API, export, arşiv ve analiz araçları</p>
              )}
              <Button className="w-full mb-6">Başla</Button>
              <FeatureList features={ARASTIRMACI_FEATURES} />
            </CardContent>
          </Card>

          {/* Siyasi Parti */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-semibold">Siyasi Parti</p>
              <div className="mt-4 mb-1">
                <span className="text-3xl font-bold tabular-nums">
                  ₺{fmt(partyPrice)}
                </span>
                <span className="text-sm text-muted-foreground"> /ay</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {members < 100000
                  ? '100.000 üyeye kadar sabit ücret'
                  : `${fmt(members)} üye × ₺0,01`}
              </p>

              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Resmî üye sayısı</span>
                  <span className="font-medium tabular-nums">{fmt(members)}</span>
                </div>
                <Slider
                  value={[members]}
                  onValueChange={([v]) => setMembers(v)}
                  min={50000}
                  max={12000000}
                  step={50000}
                />
                <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>50.000</span>
                  <span>12.000.000</span>
                </div>
              </div>

              <Button variant="outline" className="w-full mb-6">İletişime Geç</Button>
              <FeatureList features={PARTI_FEATURES} />
            </CardContent>
          </Card>
        </div>

        {/* Ücretsiz */}
        <Separator className="mb-12" />
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <p className="text-sm font-semibold">Ücretsiz</p>
            <p className="text-xs text-muted-foreground mt-1">Oy kullanan herkes için.</p>
          </div>
          <FeatureList features={UCRETSIZ_FEATURES} />
        </div>
      </main>
    </>
  );
}
