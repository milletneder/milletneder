'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import PageHero from '@/components/layout/PageHero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Check } from 'lucide-react';

type BillingCycle = 'monthly' | 'yearly';

const VATANDAS_FEATURES = [
  'Aylık raporlara anında erişim (yayınlandığı gün)',
  'İl kırılımı — ilçe bazlı detay, parti dağılımı, katılım oranları',
  'İlçe bazlı sıralama ve karşılaştırma',
  'İl bazlı trend — aylara göre parti değişim grafiği',
];

const ARASTIRMACI_FEATURES = [
  'Vatandaş paketindeki her şey',
  'API erişimi — JSON formatında tüm veriye programatik erişim',
  'CSV/Excel export — il, ilçe, demografik kırılımları indir',
  'Çapraz tablo oluşturucu — çok boyutlu sorgular',
  'Tüm turların tam arşivi ve karşılaştırma',
  'Trend grafiği oluşturucu — özel grafik oluştur ve indir',
  'Embed widget — canlı grafiği kendi sitene göm',
  'Ağırlıklandırma şeffaflığı — adım adım yöntem etkisi',
  'Haftalık analiz e-postası',
];

const PARTI_FEATURES = [
  'Araştırmacı paketindeki her şey',
  'Parti odaklı canlı dashboard — anlık oy akışı ve hedef takibi',
  'Rakip karşılaştırma paneli — 3 rakiple tüm boyutlarda karşılaştırma',
  'Seçmen profil analizi — çapraz demografik dağılım',
  'Kayıp/kazanç matrisi — partiler arası oy geçişleri',
  'Coğrafi performans haritası — il/ilçe bazlı güç/zayıflık ısı haritası',
  'Swing seçmen analizi — kararsız oyların profili ve geçiş yönleri',
  'Milletvekili projeksiyonu — D\'Hondt hesaplaması ile sandalye tahmini',
  'Bölgesel erken uyarı — oy kaybedilen illerde otomatik alarm',
  'White-label PDF rapor — parti logolu markalı analiz',
  'Aylık 2 adet istek bazlı özel rapor',
];

const UCRETSIZ_FEATURES = [
  'Ulusal genel sonuçlar (ham + ağırlıklı)',
  'Haritada parti renkleri',
  'Güven skoru ve şeffaflık raporu',
  'Demografik karşılaştırmalar (yaş, gelir, cinsiyet, eğitim)',
  'Katılım sıralaması',
  'Oy geçmişi ve profil yönetimi',
  'Aylık raporlar — 1 ay gecikmeli erişim',
];

function formatCurrency(value: number): string {
  return value.toLocaleString('tr-TR');
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-2.5">
      {features.map((feature) => (
        <li key={feature} className="flex gap-2.5 text-sm">
          <Check className="size-4 shrink-0 mt-0.5 text-foreground" />
          <span className="text-muted-foreground">{feature}</span>
        </li>
      ))}
    </ul>
  );
}

export default function UcretlerPage() {
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [partyMembers, setPartyMembers] = useState(500000);

  const partyPrice = partyMembers < 100000
    ? 1000
    : Math.round(partyMembers * 0.01);

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        <PageHero
          title="Ücretler"
          subtitle="Bağımsız ve şeffaf seçim verisine erişim. İhtiyacınıza uygun planı seçin."
        />

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setBilling('monthly')}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              billing === 'monthly'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Aylık
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              billing === 'yearly'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Yıllık
            <Badge variant="outline" className="ml-2 text-xs">Tasarruf</Badge>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Vatandaş */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vatandaş</CardTitle>
              <p className="text-xs text-muted-foreground">
                Detaylı il/ilçe kırılımları ve raporlara anında erişim.
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                {billing === 'monthly' ? (
                  <>
                    <span className="text-3xl font-bold tabular-nums">₺99</span>
                    <span className="text-sm text-muted-foreground"> /ay</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold tabular-nums">₺999</span>
                    <span className="text-sm text-muted-foreground"> /yıl</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      ₺83/ay — yılda ₺189 tasarruf
                    </p>
                  </>
                )}
              </div>
              <Button className="w-full mb-6">Başla</Button>
              <FeatureList features={VATANDAS_FEATURES} />
            </CardContent>
          </Card>

          {/* Araştırmacı */}
          <Card className="ring-2 ring-foreground">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Araştırmacı</CardTitle>
                <Badge>Popüler</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Gazeteciler ve araştırmacılar için veri erişimi ve analiz araçları.
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                {billing === 'monthly' ? (
                  <>
                    <span className="text-3xl font-bold tabular-nums">₺499</span>
                    <span className="text-sm text-muted-foreground"> /ay</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold tabular-nums">₺4.999</span>
                    <span className="text-sm text-muted-foreground"> /yıl</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      ₺417/ay — yılda ₺989 tasarruf
                    </p>
                  </>
                )}
              </div>
              <Button className="w-full mb-6">Başla</Button>
              <FeatureList features={ARASTIRMACI_FEATURES} />
            </CardContent>
          </Card>

          {/* Siyasi Parti */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Siyasi Parti</CardTitle>
              <p className="text-xs text-muted-foreground">
                Partilere özel analiz paneli, rakip karşılaştırma ve stratejik araçlar.
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-3xl font-bold tabular-nums">₺{formatCurrency(partyPrice)}</span>
                <span className="text-sm text-muted-foreground"> /ay</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {partyMembers < 100000
                    ? '100.000 üyeye kadar sabit ücret'
                    : `${formatCurrency(partyMembers)} üye × ₺0,01`
                  }
                </p>
              </div>

              {/* Member Slider */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Resmî üye sayısı</span>
                  <span className="font-medium text-foreground tabular-nums">{formatCurrency(partyMembers)}</span>
                </div>
                <Slider
                  value={[partyMembers]}
                  onValueChange={([v]) => setPartyMembers(v)}
                  min={50000}
                  max={12000000}
                  step={50000}
                />
                <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>50.000</span>
                  <span>12.000.000</span>
                </div>
              </div>

              <Button className="w-full mb-6">İletişime Geç</Button>
              <FeatureList features={PARTI_FEATURES} />
            </CardContent>
          </Card>
        </div>

        {/* Ücretsiz Plan */}
        <Separator className="mb-16" />

        <div className="max-w-2xl mx-auto text-center mb-10">
          <h2 className="text-lg font-bold mb-2">Ücretsiz Plan</h2>
          <p className="text-sm text-muted-foreground">
            Oy kullanan herkes aşağıdaki özelliklere ücretsiz erişir.
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <FeatureList features={UCRETSIZ_FEATURES} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
