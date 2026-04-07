'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/admin/hooks';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface ConfigItem {
  config_key: string;
  is_enabled: boolean;
  parameters: Record<string, unknown>;
}

const CONFIG_LABELS: Record<string, { title: string; description: string; detail: string; formula?: string; warning?: string }> = {
  post_stratification: {
    title: 'Post-Stratification',
    description: 'Demografik dağılıma göre ağırlıklandırma (yaş, cinsiyet, bölge). Basit ve etkili.',
    detail: 'Anketteki her demografik grubun payını TÜİK gerçek nüfus payıyla karşılaştırır. Fazla temsil edilen grupların oyunu düşürür, az temsil edilenleri artırır. Örneğin ankette %70 genç varsa ama TÜİK\'e göre %35\'se, gençlerin ağırlığı yarıya düşer. Hangi boyutlarda düzeltme yapılacağını aşağıdan seçebilirsiniz.',
    formula: 'ağırlık = nüfus_payı / örneklem_payı',
    warning: 'Raking aktifse Post-Stratification devre dışı kalır — ikisi aynı anda çalışmaz.',
  },
  raking: {
    title: 'Raking (IPF)',
    description: 'Çok boyutlu dengeleme. Post-stratification\'dan daha doğru. İkisi aynı anda aktif olamaz.',
    detail: 'Post-Stratification\'ın gelişmiş versiyonu. Birden fazla boyutu (yaş + cinsiyet + bölge + eğitim) aynı anda dengeler. Her iterasyonda bir boyuttaki sapmalar düzeltilir, yakınsamaya kadar tekrarlanır. Profesyonel anket şirketlerinin standart yöntemidir. Daha doğru ama daha fazla hesaplama gücü gerektirir.',
    formula: 'Her iterasyonda: düzeltme = hedef_pay / mevcut_pay (tüm boyutlar yakınsayana kadar)',
    warning: 'Raking aktifse Post-Stratification otomatik olarak devre dışı kalır.',
  },
  regional_quota: {
    title: 'Bölgesel Kota',
    description: '7 coğrafi bölgenin seçmen oranına göre ağırlıklandırma.',
    detail: 'Türkiye\'nin 7 coğrafi bölgesini (Marmara, İç Anadolu, Ege, Akdeniz, Karadeniz, Güneydoğu Anadolu, Doğu Anadolu) YSK seçmen oranlarına göre ağırlıklandırır. İstanbul\'dan 5.000 oy gelip Doğu Anadolu\'dan 200 oy geldiyse, Doğu Anadolu\'nun etkisi artırılır. Bölgesel referans payları "Referans Veriler" sayfasından düzenlenebilir.',
    formula: 'ağırlık = bölge_seçmen_payı / örneklem_bölge_payı',
  },
  turnout: {
    title: 'Katılım Niyeti',
    description: 'Seçime katılma olasılığına göre ağırlıklandırma (Kesin=1, Muhtemel=0.6, Belki=0.3).',
    detail: 'Kullanıcılar profillerinde "seçime katılacak mısınız?" sorusuna cevap veriyor. Cevaplarına göre oylarının ağırlığı değişir. "Katılmayacağım" diyen birinin oyu minimum ağırlığa düşer (varsayılan 0.25). ABD ve Avrupa seçim anketlerinde standart yöntemdir. Aşağıdaki ağırlıkları istediğiniz gibi ayarlayabilirsiniz.',
    formula: 'Kesin=1.0 | Muhtemel=0.6 | Belki=0.3 | Hayır=0.25',
  },
  recency: {
    title: 'Zaman Ağırlığı',
    description: 'Son gelen oyların daha yüksek ağırlıklandırılması. Lambda değeri ayarlanabilir.',
    detail: 'Eski oylar zamanla değer kaybeder, yeni oylar daha ağırlıklı sayılır. Üstel bozunma fonksiyonu kullanır. Lambda=0.01 ile 30 gün önce verilen bir oy ~%74 ağırlığa düşer. Seçim yaklaştıkça lambda değerini artırmak daha güncel sonuç verir.',
    formula: 'ağırlık = e^(-λ × gün_sayısı)',
  },
  bayesian: {
    title: 'Bayesian Düzeltme (Henüz Aktif Değil)',
    description: 'Küçük örneklemlerde sonuçları ulusal ortalamaya doğru dengeleme. Bu yöntem henüz engine\'de implemente edilmemiştir.',
    detail: 'Az veri olan bölgelerin/grupların sonuçlarını ulusal ortalamaya doğru çeker. Örneklem büyüdükçe düzeltme etkisi otomatik azalır. NOT: Bu yöntem henüz ağırlıklandırma motorunda aktif değildir. Toggle açılsa bile sonuçlara etkisi olmaz. Küçük örneklem düzeltmesi şu an "sample-size blending" ile harita API\'lerinde uygulanmaktadır.',
    formula: 'düzeltilmiş = (n × yerel + k × ulusal) / (n + k)',
  },
  partisan_bias: {
    title: 'Partizan Sapma',
    description: '2023 seçim sonuçları ile karşılaştırarak örneklem sapmasını düzeltme.',
    detail: 'Kullanıcılara "2023\'te kime oy verdiniz?" diye sorulur. Cevaplar YSK gerçek 2023 seçim sonuçlarıyla karşılaştırılır. Eğer ankette AKP seçmeni örneklemde az temsil ediliyorsa, AKP oylarının ağırlığı artırılır. Referans veriler "Referans Veriler" sayfasındaki 2023 seçim sonuçları tablosundan gelir. Parametresiz — otomatik hesaplar.',
    formula: 'düzeltme = gerçek_2023_payı / örneklem_2023_payı',
  },
  fraud_detection: {
    title: 'Sahtecilik Tespiti',
    description: 'IP analizi, VPN tespiti, disposable email kontrolü ile sahtecilik puanı.',
    detail: 'Her kullanıcıya 0-100 arası sahtecilik puanı verir. Faktörler: aynı IP alt ağından 3+ kullanıcı (10-25 puan), VPN/datacenter IP (20 puan), hesap yaşı < 1 saat (10 puan), tek kullanımlık email (15 puan), ardışık email kalıbı (10 puan), boş profil (5 puan), şüpheli tarayıcı (15 puan). Eşik üzerindeki kullanıcıların oyu tamamen sıfırlanır. Altındakilerin oyu kademeli düşürülür.',
    formula: 'puan ≥ eşik → ağırlık = 0 | puan < eşik → ağırlık = 1 - (puan / 100)',
  },
  weight_cap: {
    title: 'Ağırlık Sınırı',
    description: 'Tüm ağırlıkların minimum ve maksimum değerlerini sınırlama.',
    detail: 'Tüm ağırlıklandırma yöntemlerinin sonucu çarpıldıktan sonra, nihai ağırlığın aşırı uçlara gitmesini engeller. Güvenlik mekanizmasıdır — hiçbir oy minimum değerin altına düşemez veya maksimum değerin üstüne çıkamaz. Tek bir kişinin oyu sonsuz güçlenemez.',
    formula: 'nihai_ağırlık = clamp(çarpım, min, max)',
  },
};

const CONFIG_ORDER = [
  'post_stratification', 'raking', 'regional_quota', 'turnout',
  'recency', 'bayesian', 'partisan_bias', 'fraud_detection', 'weight_cap',
];

export default function WeightingPage() {
  useAdminAuth();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<Record<string, unknown> | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const headers = useCallback(() => {
    return {
      'Content-Type': 'application/json',
    };
  }, []);

  useEffect(() => {
    fetch('/api/admin/weighting', { headers: headers() })
      .then(r => r.json())
      .then(data => setConfigs(data.configs || []))
      .finally(() => setLoading(false));
  }, [headers]);

  const getConfig = (key: string): ConfigItem => {
    return configs.find(c => c.config_key === key) || {
      config_key: key,
      is_enabled: false,
      parameters: {},
    };
  };

  const updateConfig = async (key: string, updates: Partial<ConfigItem>) => {
    setSaving(key);
    const current = getConfig(key);
    const updated = { ...current, ...updates };

    try {
      await fetch('/api/admin/weighting', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          config_key: key,
          round_id: null,
          is_enabled: updated.is_enabled,
          parameters: updated.parameters,
        }),
      });

      setConfigs(prev => {
        const idx = prev.findIndex(c => c.config_key === key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    } finally {
      setSaving(null);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const res = await fetch('/api/admin/weighting/preview', {
        method: 'POST',
        headers: headers(),
      });
      const data = await res.json();
      setPreviewResult(data);
      setPreviewOpen(true);
    } finally {
      setPreviewing(false);
    }
  };

  const updateParam = (key: string, paramKey: string, value: unknown) => {
    const current = getConfig(key);
    const params = { ...current.parameters, [paramKey]: value };
    updateConfig(key, { parameters: params });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-24 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Agirliklandirma Ayarlari</h1>
          <p className="text-sm text-muted-foreground mt-1">Anket sonuclarini duzeltmek icin kullanilan yontemleri yonetin.</p>
        </div>
        <Button onClick={handlePreview} disabled={previewing}>
          {previewing ? 'Hesaplaniyor...' : 'Sonuclari Onizle'}
        </Button>
      </div>

      <Card className="mb-8">
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            Asagidaki yontemler, online anketin orneklem sapmalarini duzeltmek icin kullanilir. Her yontemi acip kapatabilir ve parametrelerini ayarlayabilirsiniz. Degisiklikler aninda kaydedilir.
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Aktif yontemler sirayla uygulanir ve carpilarak birlestirilir. Sonuc &quot;Agirlik Siniri&quot; ile alt-ust limit arasina cekilir. Degisiklik yapmadan once &quot;Sonuclari Onizle&quot; butonuyla etkiyi gorebilirsiniz -- onizleme kaydetmeden hesaplama yapar.
          </p>
          <p className="text-xs text-muted-foreground">
            Siralama: Raking/Post-Strat &rarr; Katilim Niyeti &rarr; Zaman Agirligi &rarr; Partizan Sapma &rarr; Bolgesel Kota &rarr; Sahtecilik &rarr; Agirlik Siniri
          </p>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Onizleme Sonuclari</DialogTitle>
            <DialogDescription>
              Bu sonuclar mevcut konfigurasyon ile hesaplanmistir. &quot;Ham&quot; sutunu agirliklandirma olmadan, &quot;Agirlikli&quot; sutunu aktif yontemler uygulandiktan sonraki yuzdeleri gosterir.
            </DialogDescription>
          </DialogHeader>
          {previewResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Orneklem</p>
                  <p className="text-lg font-bold">{(previewResult as { sampleSize?: number }).sampleSize?.toLocaleString('tr-TR')}</p>
                  <p className="text-[11px] text-muted-foreground">Toplam gecerli oy sayisi</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Efektif Orneklem</p>
                  <p className="text-lg font-bold">{(previewResult as { effectiveSampleSize?: number }).effectiveSampleSize?.toLocaleString('tr-TR')}</p>
                  <p className="text-[11px] text-muted-foreground">Agirliklandirma sonrasi etkin buyukluk</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guven Skoru</p>
                  <p className="text-lg font-bold">{((previewResult as { confidence?: { overall?: number } }).confidence?.overall ?? 0).toFixed(1)}/100</p>
                  <p className="text-[11px] text-muted-foreground">0=guvenilmez, 100=cok guvenilir</p>
                </div>
              </div>
              {Array.isArray((previewResult as { parties?: unknown[] }).parties) && (
                <div className="space-y-1">
                  {((previewResult as { parties: Array<{ party: string; rawPct: number; weightedPct: number; delta: number }> }).parties).map(p => (
                    <div key={p.party} className="flex items-center justify-between text-sm">
                      <span className="font-medium w-32">{p.party}</span>
                      <span className="text-muted-foreground">Ham: %{p.rawPct.toFixed(1)}</span>
                      <span>Agirlikli: %{p.weightedPct.toFixed(1)}</span>
                      <span className={`text-xs ${p.delta > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {p.delta > 0 ? '+' : ''}{p.delta.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Config Sections */}
      <Accordion type="single" collapsible className="space-y-3">
        {CONFIG_ORDER.map(key => {
          const config = getConfig(key);
          const info = CONFIG_LABELS[key];

          return (
            <AccordionItem key={key} value={key} className="border border-border rounded-lg">
              <div className="flex items-center gap-3 px-4 py-3">
                <Switch
                  checked={config.is_enabled}
                  onCheckedChange={(checked) => updateConfig(key, { is_enabled: checked })}
                />
                <AccordionTrigger className="flex-1 hover:no-underline py-0">
                  <div className="text-left">
                    <h3 className="text-sm font-medium">{info?.title || key}</h3>
                    <p className="text-xs text-muted-foreground">{info?.description}</p>
                  </div>
                  {saving === key && <span className="text-xs text-muted-foreground mr-2">Kaydediliyor...</span>}
                </AccordionTrigger>
              </div>

              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Detail Card */}
                  <Card className="bg-muted/50">
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">{info?.detail}</p>
                      {info?.formula && (
                        <div className="bg-background border border-border rounded-md px-3 py-2">
                          <p className="text-[11px] text-muted-foreground mb-0.5">Formul</p>
                          <code className="bg-muted rounded px-2 py-1 text-xs font-mono">{info.formula}</code>
                        </div>
                      )}
                      {info?.warning && (
                        <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">{info.warning}</p>
                      )}
                    </CardContent>
                  </Card>

                  {key === 'post_stratification' && (
                    <DimensionSelector
                      dimensions={(config.parameters.dimensions as string[]) || ['age', 'gender', 'region']}
                      onChange={(dims) => updateParam(key, 'dimensions', dims)}
                    />
                  )}

                  {key === 'raking' && (
                    <>
                      <DimensionSelector
                        dimensions={(config.parameters.dimensions as string[]) || ['age', 'gender', 'region', 'education']}
                        onChange={(dims) => updateParam(key, 'dimensions', dims)}
                      />
                      <NumberInput
                        label="Max Iterasyon"
                        value={(config.parameters.maxIterations as number) ?? 50}
                        onChange={(v) => updateParam(key, 'maxIterations', v)}
                      />
                      <NumberInput
                        label="Yakinsama Esigi"
                        value={(config.parameters.convergenceThreshold as number) ?? 0.001}
                        onChange={(v) => updateParam(key, 'convergenceThreshold', v)}
                        step={0.001}
                      />
                    </>
                  )}

                  {key === 'turnout' && (
                    <div className="grid grid-cols-4 gap-3">
                      {(['T1', 'T2', 'T3', 'T4'] as const).map(t => (
                        <NumberInput
                          key={t}
                          label={t === 'T1' ? 'Kesin' : t === 'T2' ? 'Muhtemel' : t === 'T3' ? 'Belki' : 'Hayir'}
                          value={((config.parameters.weights as Record<string, number>) ?? {})[t] ?? (t === 'T1' ? 1 : t === 'T2' ? 0.6 : t === 'T3' ? 0.3 : 0)}
                          onChange={(v) => {
                            const weights = { ...((config.parameters.weights as Record<string, number>) ?? {}), [t]: v };
                            updateParam(key, 'weights', weights);
                          }}
                          step={0.1}
                          min={0}
                          max={1}
                        />
                      ))}
                    </div>
                  )}

                  {key === 'recency' && (
                    <NumberInput
                      label="Lambda (0.001 = yavas bozunma, 0.1 = hizli bozunma)"
                      value={(config.parameters.lambda as number) ?? 0.01}
                      onChange={(v) => updateParam(key, 'lambda', v)}
                      step={0.001}
                      min={0.001}
                      max={0.1}
                    />
                  )}

                  {key === 'bayesian' && (
                    <>
                      <NumberInput
                        label="Minimum Orneklem Boyutu"
                        value={(config.parameters.minSampleSize as number) ?? 30}
                        onChange={(v) => updateParam(key, 'minSampleSize', v)}
                      />
                      <NumberInput
                        label="Prior Gucu"
                        value={(config.parameters.priorStrength as number) ?? 10}
                        onChange={(v) => updateParam(key, 'priorStrength', v)}
                      />
                    </>
                  )}

                  {key === 'weight_cap' && (
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        label="Minimum Agirlik"
                        value={(config.parameters.min as number) ?? 0.2}
                        onChange={(v) => updateParam(key, 'min', v)}
                        step={0.1}
                        min={0}
                        max={1}
                      />
                      <NumberInput
                        label="Maksimum Agirlik"
                        value={(config.parameters.max as number) ?? 5}
                        onChange={(v) => updateParam(key, 'max', v)}
                        step={0.5}
                        min={1}
                        max={20}
                      />
                    </div>
                  )}

                  {key === 'fraud_detection' && (
                    <NumberInput
                      label="Esik Puani (ustu → agirlik 0)"
                      value={(config.parameters.threshold as number) ?? 80}
                      onChange={(v) => updateParam(key, 'threshold', v)}
                      min={0}
                      max={100}
                    />
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function DimensionSelector({ dimensions, onChange }: { dimensions: string[]; onChange: (dims: string[]) => void }) {
  const ALL_DIMS = [
    { value: 'age', label: 'Yas' },
    { value: 'gender', label: 'Cinsiyet' },
    { value: 'education', label: 'Egitim' },
    { value: 'region', label: 'Bolge' },
  ];

  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-2">Boyutlar</Label>
      <div className="flex flex-wrap gap-2">
        {ALL_DIMS.map(d => (
          <Button
            key={d.value}
            variant={dimensions.includes(d.value) ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              const next = dimensions.includes(d.value)
                ? dimensions.filter(x => x !== d.value)
                : [...dimensions, d.value];
              onChange(next);
            }}
          >
            {d.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, step = 1, min, max }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        step={step}
        min={min}
        max={max}
      />
    </div>
  );
}
