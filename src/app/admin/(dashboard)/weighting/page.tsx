'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/admin/hooks';

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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<Record<string, unknown> | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const headers = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    return {
      'X-Admin-Token': token || '',
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
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-6 w-6 border-2 border-black border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-black">Ağırlıklandırma Ayarları</h1>
          <p className="text-sm text-neutral-500 mt-1">Anket sonuçlarını düzeltmek için kullanılan yöntemleri yönetin.</p>
        </div>
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="border border-black bg-black text-white px-4 h-9 text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {previewing ? 'Hesaplanıyor...' : 'Sonuçları Önizle'}
        </button>
      </div>

      <div className="bg-neutral-50 border border-neutral-100 p-4 mb-8">
        <p className="text-sm text-neutral-700 leading-relaxed mb-2">
          Aşağıdaki yöntemler, online anketin örneklem sapmalarını düzeltmek için kullanılır. Her yöntemi açıp kapatabilir ve parametrelerini ayarlayabilirsiniz. Değişiklikler anında kaydedilir.
        </p>
        <p className="text-xs text-neutral-500 mb-2">
          Aktif yöntemler sırayla uygulanır ve çarpılarak birleştirilir. Sonuç &quot;Ağırlık Sınırı&quot; ile alt-üst limit arasına çekilir. Değişiklik yapmadan önce &quot;Sonuçları Önizle&quot; butonuyla etkiyi görebilirsiniz — önizleme kaydetmeden hesaplama yapar.
        </p>
        <div className="text-xs text-neutral-400 space-y-1">
          <p>Sıralama: Raking/Post-Strat → Katılım Niyeti → Zaman Ağırlığı → Partizan Sapma → Bölgesel Kota → Sahtecilik → Ağırlık Sınırı</p>
        </div>
      </div>

      {/* Preview Results */}
      {previewResult && (
        <div className="border border-neutral-200 p-4 mb-8">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-black">Önizleme Sonuçları</h3>
            <button onClick={() => setPreviewResult(null)} className="text-xs text-neutral-400 hover:text-black">&times; Kapat</button>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            Bu sonuçlar mevcut konfigürasyonla hesaplanmıştır. &quot;Ham&quot; sütunu ağırlıklandırma olmadan, &quot;Ağırlıklı&quot; sütunu aktif yöntemler uygulandıktan sonraki yüzdeleri gösterir. Delta farkı gösterir (+1.2 = ağırlıklandırmayla 1.2 puan arttı).
          </p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-neutral-500">Örneklem</p>
              <p className="text-lg font-bold">{(previewResult as { sampleSize?: number }).sampleSize?.toLocaleString('tr-TR')}</p>
              <p className="text-[11px] text-neutral-400">Toplam geçerli oy sayısı</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Efektif Örneklem</p>
              <p className="text-lg font-bold">{(previewResult as { effectiveSampleSize?: number }).effectiveSampleSize?.toLocaleString('tr-TR')}</p>
              <p className="text-[11px] text-neutral-400">Ağırlıklandırma sonrası etkin büyüklük</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Güven Skoru</p>
              <p className="text-lg font-bold">{((previewResult as { confidence?: { overall?: number } }).confidence?.overall ?? 0).toFixed(1)}/100</p>
              <p className="text-[11px] text-neutral-400">0=güvenilmez, 100=çok güvenilir</p>
            </div>
          </div>
          {Array.isArray((previewResult as { parties?: unknown[] }).parties) && (
            <div className="space-y-1">
              {((previewResult as { parties: Array<{ party: string; rawPct: number; weightedPct: number; delta: number }> }).parties).map(p => (
                <div key={p.party} className="flex items-center justify-between text-sm">
                  <span className="font-medium w-32">{p.party}</span>
                  <span className="text-neutral-500">Ham: %{p.rawPct.toFixed(1)}</span>
                  <span>Ağırlıklı: %{p.weightedPct.toFixed(1)}</span>
                  <span className={`text-xs ${p.delta > 0 ? 'text-neutral-700' : 'text-neutral-400'}`}>
                    {p.delta > 0 ? '+' : ''}{p.delta.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Config Sections */}
      <div className="space-y-3">
        {CONFIG_ORDER.map(key => {
          const config = getConfig(key);
          const info = CONFIG_LABELS[key];
          const isExpanded = expanded === key;

          return (
            <div key={key} className="border border-neutral-200">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50"
                onClick={() => setExpanded(isExpanded ? null : key)}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateConfig(key, { is_enabled: !config.is_enabled });
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      config.is_enabled ? 'bg-black' : 'bg-neutral-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      config.is_enabled ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                  <div>
                    <h3 className="text-sm font-medium text-black">{info?.title || key}</h3>
                    <p className="text-xs text-neutral-400">{info?.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {saving === key && <span className="text-xs text-neutral-400">Kaydediliyor...</span>}
                  <span className="text-neutral-300 text-sm">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 py-4 border-t border-neutral-100 space-y-4">
                  {/* Detaylı Açıklama */}
                  <div className="bg-neutral-50 border border-neutral-100 p-4 space-y-3">
                    <p className="text-sm text-neutral-700 leading-relaxed">{info?.detail}</p>
                    {info?.formula && (
                      <div className="bg-white border border-neutral-200 px-3 py-2">
                        <p className="text-[11px] text-neutral-400 mb-0.5">Formül</p>
                        <code className="text-xs font-mono text-black">{info.formula}</code>
                      </div>
                    )}
                    {info?.warning && (
                      <p className="text-xs text-neutral-500 border-l-2 border-neutral-300 pl-3">{info.warning}</p>
                    )}
                  </div>

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
                        label="Max İterasyon"
                        value={(config.parameters.maxIterations as number) ?? 50}
                        onChange={(v) => updateParam(key, 'maxIterations', v)}
                      />
                      <NumberInput
                        label="Yakınsama Eşiği"
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
                          label={t === 'T1' ? 'Kesin' : t === 'T2' ? 'Muhtemel' : t === 'T3' ? 'Belki' : 'Hayır'}
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
                      label="Lambda (0.001 = yavaş bozunma, 0.1 = hızlı bozunma)"
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
                        label="Minimum Örneklem Boyutu"
                        value={(config.parameters.minSampleSize as number) ?? 30}
                        onChange={(v) => updateParam(key, 'minSampleSize', v)}
                      />
                      <NumberInput
                        label="Prior Gücü"
                        value={(config.parameters.priorStrength as number) ?? 10}
                        onChange={(v) => updateParam(key, 'priorStrength', v)}
                      />
                    </>
                  )}

                  {key === 'weight_cap' && (
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        label="Minimum Ağırlık"
                        value={(config.parameters.min as number) ?? 0.2}
                        onChange={(v) => updateParam(key, 'min', v)}
                        step={0.1}
                        min={0}
                        max={1}
                      />
                      <NumberInput
                        label="Maksimum Ağırlık"
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
                      label="Eşik Puanı (üstü → ağırlık 0)"
                      value={(config.parameters.threshold as number) ?? 80}
                      onChange={(v) => updateParam(key, 'threshold', v)}
                      min={0}
                      max={100}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DimensionSelector({ dimensions, onChange }: { dimensions: string[]; onChange: (dims: string[]) => void }) {
  const ALL_DIMS = [
    { value: 'age', label: 'Yaş' },
    { value: 'gender', label: 'Cinsiyet' },
    { value: 'education', label: 'Eğitim' },
    { value: 'region', label: 'Bölge' },
  ];

  return (
    <div>
      <p className="text-xs text-neutral-500 mb-2">Boyutlar</p>
      <div className="flex flex-wrap gap-2">
        {ALL_DIMS.map(d => (
          <button
            key={d.value}
            onClick={() => {
              const next = dimensions.includes(d.value)
                ? dimensions.filter(x => x !== d.value)
                : [...dimensions, d.value];
              onChange(next);
            }}
            className={`px-3 py-1.5 text-xs transition-colors ${
              dimensions.includes(d.value)
                ? 'border-2 border-black bg-neutral-50 text-black'
                : 'border border-neutral-200 text-neutral-500 hover:border-black'
            }`}
          >
            {d.label}
          </button>
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
      <label className="text-xs text-neutral-500 block mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        step={step}
        min={min}
        max={max}
        className="border border-neutral-200 px-3 py-1.5 text-sm w-full focus:outline-none focus:border-black"
      />
    </div>
  );
}
