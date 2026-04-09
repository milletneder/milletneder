'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Check, GraduationCap } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { type PlanTier } from '@/lib/billing/plans';

declare global {
  interface Window {
    LemonSqueezy?: {
      Url?: {
        Open?: (url: string) => void;
      };
    };
  }
}

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
    <ul className="space-y-3">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2.5">
          <Check className="size-4 shrink-0 mt-0.5 text-foreground" />
          <span className="text-muted-foreground">{f}</span>
        </li>
      ))}
    </ul>
  );
}

export default function UcretlerPage() {
  const [yearly, setYearly] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<PlanTier | null>(null);

  const { isLoggedIn, token } = useAuth();
  const router = useRouter();

  /* Fetch current subscription to mark active plan */
  const fetchCurrentTier = useCallback(async () => {
    if (!isLoggedIn || !token) {
      setCurrentTier(null);
      return;
    }
    try {
      const res = await fetch('/api/billing/subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setCurrentTier('free');
        return;
      }
      const data = await res.json();
      setCurrentTier(data.subscription?.plan_tier ?? 'free');
    } catch {
      setCurrentTier('free');
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    fetchCurrentTier();
  }, [fetchCurrentTier]);

  /* Start checkout */
  async function handleCheckout(planTier: PlanTier) {
    if (!isLoggedIn) {
      window.dispatchEvent(new CustomEvent('open-login'));
      return;
    }

    setCheckoutLoading(planTier);
    try {
      const billingInterval = yearly ? 'yearly' : 'monthly';
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planTier, billingInterval }),
      });

      if (!res.ok) return;
      const data = await res.json();
      const url = data.url;
      if (!url) return;

      // Try LemonSqueezy overlay first, fallback to new window
      if (window.LemonSqueezy?.Url?.Open) {
        window.LemonSqueezy.Url.Open(url);
      } else {
        window.open(url, '_blank');
      }
    } finally {
      setCheckoutLoading(null);
    }
  }

  function handleFreeJoin() {
    if (!isLoggedIn) {
      window.dispatchEvent(new CustomEvent('open-login'));
      return;
    }
    window.dispatchEvent(new CustomEvent('open-vote-modal'));
    router.push('/?vote=true');
  }

  function CurrentPlanBadge({ tier }: { tier: PlanTier }) {
    if (currentTier !== tier) return null;
    return <Badge variant="secondary">Mevcut Plan</Badge>;
  }

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        {/* Hero */}
        <div className="pt-16 pb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Ücretler</h1>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Bağımsız ve şeffaf seçim verisine erişim. İhtiyacınıza uygun planı seçin.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={!yearly ? 'font-medium' : 'text-muted-foreground'}>
              Aylık
            </span>
            <Switch checked={yearly} onCheckedChange={setYearly} />
            <span className={yearly ? 'font-medium' : 'text-muted-foreground'}>
              Yıllık
            </span>
            <Badge variant="outline">Tasarruf</Badge>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-16">

          {/* Vatandaş */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Vatandaş</p>
                <CurrentPlanBadge tier="vatandas" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                İl/ilçe kırılımları ve raporlara anında erişim.
              </p>

              <div className="mt-5 mb-6">
                <span className="text-4xl font-bold tabular-nums">
                  ₺{yearly ? '999' : '99'}
                </span>
                <span className="text-muted-foreground">
                  {yearly ? ' /yıl' : ' /ay'}
                </span>
                {yearly && (
                  <p className="text-sm text-muted-foreground mt-1">aylık ₺83 — yılda ₺189 tasarruf</p>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full mb-6"
                onClick={() => handleCheckout('vatandas')}
                disabled={checkoutLoading === 'vatandas' || currentTier === 'vatandas'}
              >
                {checkoutLoading === 'vatandas' ? 'Yönlendiriliyor...' : currentTier === 'vatandas' ? 'Mevcut Plan' : 'Başla'}
              </Button>
              <FeatureList features={VATANDAS_FEATURES} />
            </CardContent>
          </Card>

          {/* Araştırmacı */}
          <Card className="ring-2 ring-foreground">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Araştırmacı</p>
                <div className="flex items-center gap-2">
                  <CurrentPlanBadge tier="arastirmaci" />
                  {currentTier !== 'arastirmaci' && <Badge>Popüler</Badge>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                API, export, arşiv ve analiz araçları.
              </p>

              <div className="mt-5 mb-6">
                <span className="text-4xl font-bold tabular-nums">
                  ₺{yearly ? '4.999' : '499'}
                </span>
                <span className="text-muted-foreground">
                  {yearly ? ' /yıl' : ' /ay'}
                </span>
                {yearly && (
                  <p className="text-sm text-muted-foreground mt-1">aylık ₺417 — yılda ₺989 tasarruf</p>
                )}
              </div>

              <Button
                className="w-full mb-6"
                onClick={() => handleCheckout('arastirmaci')}
                disabled={checkoutLoading === 'arastirmaci' || currentTier === 'arastirmaci'}
              >
                {checkoutLoading === 'arastirmaci' ? 'Yönlendiriliyor...' : currentTier === 'arastirmaci' ? 'Mevcut Plan' : 'Başla'}
              </Button>
              <FeatureList features={ARASTIRMACI_FEATURES} />
            </CardContent>
          </Card>

          {/* Siyasi Parti — kurumsal, mailto CTA */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Siyasi Parti</p>
                <Badge variant="outline" className="text-[10px]">Kurumsal</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Parti odaklı analiz paneli ve stratejik araçlar.
              </p>

              <div className="mt-5 mb-1">
                <span className="text-3xl font-bold">Kurumsal</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Parti paneli kurumsal bir üründür. Hesap oluşturma, fiyatlandırma ve
                demo için bizimle iletişime geçin.
              </p>

              <Button className="w-full mb-6" asChild>
                <a href="mailto:iletisim@milletneder.com?subject=Siyasi%20Parti%20Paneli">
                  İletişime Geç
                </a>
              </Button>
              <FeatureList features={PARTI_FEATURES} />
            </CardContent>
          </Card>
        </div>

        {/* Alt bölüm: Ücretsiz + Öğrenci */}
        <Separator className="mb-12" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Ücretsiz */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Ücretsiz</p>
                <CurrentPlanBadge tier="free" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">Oy kullanan herkes için.</p>

              <div className="mt-5 mb-6">
                <span className="text-4xl font-bold tabular-nums">₺0</span>
              </div>

              <Button
                variant="outline"
                className="w-full mb-6"
                onClick={handleFreeJoin}
              >
                Ücretsiz Katıl
              </Button>
              <FeatureList features={UCRETSIZ_FEATURES} />
            </CardContent>
          </Card>

          {/* Öğrenci */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Öğrenci</p>
                  <GraduationCap className="size-4 text-muted-foreground" />
                </div>
                <CurrentPlanBadge tier="ogrenci" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                .edu.tr uzantılı e-posta ile doğrulama gerekir.
              </p>

              <div className="mt-5 mb-6">
                <span className="text-4xl font-bold tabular-nums">
                  ₺{yearly ? '2.499' : '249'}
                </span>
                <span className="text-muted-foreground">
                  {yearly ? ' /yıl' : ' /ay'}
                </span>
                {yearly && (
                  <p className="text-sm text-muted-foreground mt-1">aylık ₺208 — yılda ₺489 tasarruf</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Araştırmacı paketinin tüm özellikleri, %50 indirimli.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full mb-6"
                onClick={() => handleCheckout('ogrenci')}
                disabled={checkoutLoading === 'ogrenci' || currentTier === 'ogrenci'}
              >
                {checkoutLoading === 'ogrenci' ? 'Yönlendiriliyor...' : currentTier === 'ogrenci' ? 'Mevcut Plan' : 'Başla'}
              </Button>
              <FeatureList features={ARASTIRMACI_FEATURES} />
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Tüm planlar aylık olarak faturalandırılır. Yıllık ödeme seçeneğinde indirimli fiyat uygulanır.
          </p>
        </div>
      </main>
    </>
  );
}
