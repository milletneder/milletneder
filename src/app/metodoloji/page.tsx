'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import PageHero from '@/components/layout/PageHero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface MethodologyData {
  weighting: {
    activeMethods: string[];
    confidence: {
      overall: number;
      sampleSize: number;
      demographicBalance: number;
      geographicCoverage: number;
      fraudRate: number;
      marginOfError: number;
    };
    effectiveSampleSize: number;
    sampleSize: number;
  } | null;
  totalVotes: number;
  validVotes: number;
  cleanVotePercentage: number;
}

const METHOD_INFO: Record<string, { title: string; description: string; formula: string }> = {
  post_stratification: {
    title: 'Post-Stratification (Tabakalaştırma Sonrası Ağırlıklandırma)',
    description: 'Her demografik grubun anket içindeki payı, gerçek nüfus payı ile karşılaştırılır. Fazla temsil edilen grupların ağırlığı düşürülür, az temsil edilen grupların ağırlığı artırılır.',
    formula: 'ağırlık = nüfus_payı / örneklem_payı',
  },
  raking: {
    title: 'Raking (Yinelemeli Orantılı Uyumlama)',
    description: 'Birden fazla demografik boyutu (yaş, cinsiyet, bölge, eğitim) aynı anda dengeler. Her iterasyonda bir boyuttaki sapmalar düzeltilir, tüm boyutlar yakınsamaya kadar tekrarlanır. Profesyonel anket şirketlerinin standart yöntemidir.',
    formula: 'Her iterasyonda: düzeltme = hedef_pay / mevcut_pay',
  },
  turnout: {
    title: 'Katılım Niyeti Ağırlıklandırması',
    description: 'Her katılımcının seçime katılma niyeti sorulur. "Kesin katılacağım" diyenlerin oyu tam ağırlıkla sayılırken, "belki" diyenlerin etkisi azaltılır. Bu yöntem ABD ve Avrupa anketlerinde yaygındır.',
    formula: 'Kesin = 1.0, Muhtemel = 0.6, Belki = 0.3, Hayır = 0.0',
  },
  recency: {
    title: 'Zaman Ağırlıklandırması',
    description: 'Son gelen oylar daha anlamlı kabul edilir. Üstel bozunma fonksiyonu ile eski oyların etkisi kademeli olarak azaltılır.',
    formula: 'ağırlık = e^(-λ × gün_sayısı)',
  },
  bayesian: {
    title: 'Bayesian Düzeltme',
    description: 'Küçük örneklemlerde sonuçlar güvenilmez olabilir. Bu yöntem, az veri olan bölgelerin sonuçlarını ulusal ortalamaya doğru hafifçe çeker. Örneklem büyüdükçe düzeltme etkisi azalır.',
    formula: 'düzeltilmiş = (n × yerel + k × ulusal) / (n + k)',
  },
  partisan_bias: {
    title: 'Partizan Sapma Düzeltmesi',
    description: '2023 seçim sonuçları ile anketteki katılımcıların beyan ettikleri 2023 oyları karşılaştırılır. Eğer belirli bir parti fazla temsil ediliyorsa, o parti seçmenlerinin ağırlığı orantılı olarak düzeltilir.',
    formula: 'düzeltme = gerçek_2023_payı / örneklem_2023_payı',
  },
  regional_quota: {
    title: 'Bölgesel Kota Ağırlıklandırması',
    description: 'Türkiye\'nin 7 coğrafi bölgesinin seçmen oranları referans alınır. Fazla temsil edilen bölgelerin etkisi azaltılır, az temsil edilen bölgeler güçlendirilir.',
    formula: 'ağırlık = bölge_seçmen_payı / örneklem_bölge_payı',
  },
  fraud_detection: {
    title: 'Sahtecilik Tespiti',
    description: 'Her hesap için IP analizi, VPN kontrolü, cihaz parmak izi, e-posta kalitesi ve davranış analizi yapılır. Puan bazlı değerlendirme ile şüpheli hesapların oyları düşürülür veya sıfırlanır.',
    formula: 'puan ≥ eşik → ağırlık = 0 | puan < eşik → ağırlık = 1 - (puan/100)',
  },
};

export default function MetodolojiPage() {
  const [data, setData] = useState<MethodologyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transparency')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const activeMethods = data?.weighting?.activeMethods || [];

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <PageHero
          title="Metodoloji"
          subtitle="Bu platformun anket sonuçlarını nasıl hesapladığını ve hangi düzeltme yöntemlerini uyguladığını açıklar."
          backLink={{ href: '/', label: 'Ana Sayfa' }}
        />

        {loading ? (
          <div className="h-64" />
        ) : (
          <>
            {/* Genel Bilgi */}
            <section className="mb-12">
              <h2 className="text-lg font-bold mb-4">Neden Ağırlıklandırma?</h2>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Online anketlerde katılımcılar toplumun tamamını temsil etmez. Genellikle gençler, şehirliler ve
                    belirli siyasi eğilimdeki kişiler fazla temsil edilir. Ağırlıklandırma yöntemleri, bu sapmaları
                    TÜİK nüfus verileri ve YSK seçmen kayıtları referans alınarak düzeltir.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Aktif Yöntemler */}
            <section className="mb-12">
              <h2 className="text-lg font-bold mb-4">
                {activeMethods.length > 0 ? 'Aktif Yöntemler' : 'Kullanılabilir Yöntemler'}
              </h2>

              <div className="space-y-4">
                {Object.entries(METHOD_INFO).map(([key, info]) => {
                  const isActive = activeMethods.includes(key);
                  return (
                    <Card key={key}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{info.title}</CardTitle>
                          <Badge variant={isActive ? 'default' : 'secondary'}>
                            {isActive ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{info.description}</p>
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <p className="text-xs text-muted-foreground mb-1">Formül</p>
                          <code className="text-xs font-mono">{info.formula}</code>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Güven & İstatistikler */}
            {data?.weighting && (
              <section className="mb-12">
                <h2 className="text-lg font-bold mb-4">Güven İstatistikleri</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-2xl font-bold tabular-nums">{data.weighting.sampleSize.toLocaleString('tr-TR')}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ham örneklem</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-2xl font-bold tabular-nums">{data.weighting.effectiveSampleSize.toLocaleString('tr-TR')}</p>
                      <p className="text-xs text-muted-foreground mt-1">Efektif örneklem</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-2xl font-bold tabular-nums">{data.weighting.confidence.overall.toFixed(0)}/100</p>
                      <p className="text-xs text-muted-foreground mt-1">Güven skoru</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-2xl font-bold tabular-nums">±{data.weighting.confidence.marginOfError.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Hata payı (puan)</p>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {/* Ağırlık sınırları */}
            <section className="mb-12">
              <h2 className="text-lg font-bold mb-4">Güvenlik Önlemleri</h2>
              <Card>
                <CardContent className="pt-5">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Her ağırlık 0.2 ile 5.0 arasında sınırlandırılır. Hiçbir oy 5 kattan fazla güçlendirilemez.</li>
                    <li>Efektif örneklem boyutu hesaplanır. Ağırlıklandırma örneklemi ne kadar küçültüyorsa, hata payı da o kadar artar.</li>
                    <li>Sahtecilik tespiti ve ağırlıklandırma birbirinden bağımsız çalışır. Sahte hesaplar önce tespit edilir, sonra ağırlıklandırma uygulanır.</li>
                    <li>Tüm parametreler ve referans veriler bu sayfada şeffaf olarak paylaşılır.</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* Veri Kaynakları */}
            <section className="mb-12">
              <h2 className="text-lg font-bold mb-4">Veri Kaynakları</h2>
              <Card>
                <CardContent className="pt-0 px-0">
                  <div className="divide-y divide-border">
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm">Nüfus dağılımları</span>
                      <span className="text-xs text-muted-foreground">TÜİK 2025</span>
                    </div>
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm">İl nüfusları</span>
                      <span className="text-xs text-muted-foreground">TÜİK 2025</span>
                    </div>
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm">Bölgesel seçmen dağılımı</span>
                      <span className="text-xs text-muted-foreground">YSK 2023</span>
                    </div>
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm">2023 seçim sonuçları</span>
                      <span className="text-xs text-muted-foreground">YSK Resmi Sonuçlar</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </>
  );
}
