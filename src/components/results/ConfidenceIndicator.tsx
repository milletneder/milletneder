'use client';

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
    <div className="border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-black">Güven Skoru</h2>
        <span className="text-xs text-neutral-500">
          Hata payı: ±{marginOfError.toFixed(1)} puan
        </span>
      </div>
      <p className="text-xs text-neutral-400 mb-6">
        Sonuçların ne kadar güvenilir olduğunu gösteren bileşik skor. Katılımcı sayısı, demografik temsil, coğrafi çeşitlilik ve veri kalitesini birlikte değerlendirir.
      </p>

      {/* Overall score bar */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-3xl font-bold text-black">{overall.toFixed(0)}</span>
          <span className="text-xs text-neutral-400">/100 — {getLevel(overall)}</span>
        </div>
        <div className="w-full bg-neutral-100 h-3 overflow-hidden">
          <div
            className="h-3 transition-all duration-500 bg-black"
            style={{ width: `${Math.min(100, overall)}%` }}
          />
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-3 mb-6">
        {factors.map(f => (
          <div key={f.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-black">{f.label}</span>
              <span className="text-xs font-bold text-black">
                {f.value.toFixed(0)}/100
              </span>
            </div>
            <div className="w-full bg-neutral-100 h-3 overflow-hidden">
              <div
                className="h-3 transition-all bg-neutral-800"
                style={{ width: `${Math.min(100, f.value)}%` }}
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Sample sizes */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
        <div>
          <p className="text-xs text-neutral-400 mb-0.5">Ham örneklem</p>
          <p className="text-lg font-bold text-black tabular-nums">{totalSampleSize.toLocaleString('tr-TR')}</p>
          <p className="text-[11px] text-neutral-400">Toplam geçerli oy sayısı</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-400 mb-0.5">Efektif örneklem</p>
          <p className="text-lg font-bold text-black tabular-nums">{effectiveSampleSize.toLocaleString('tr-TR')}</p>
          <p className="text-[11px] text-neutral-400">Ağırlıklandırma sonrası etkin sayı</p>
        </div>
      </div>
    </div>
  );
}
