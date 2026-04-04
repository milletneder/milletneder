'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

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
    <div className="border border-neutral-200 p-6">
      <h2 className="text-lg font-bold text-black mb-1">
        {selectedCity ? `${selectedCity} — Şeffaflık Raporu` : 'Şeffaflık Raporu'}
      </h2>
      <p className="text-neutral-400 text-xs mb-6">
        {selectedCity
          ? `${selectedCity} iline ait veriler. Tüm veriler açık, manipülasyon gizlenmez.`
          : 'Tüm veriler açık, manipülasyon gizlenmez — sergilenir.'}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => {
          const content = (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border border-neutral-100 p-4 text-center ${stat.href ? 'hover:border-black hover:bg-neutral-50 transition-colors cursor-pointer group' : ''}`}
            >
              <div className="text-2xl font-bold tabular-nums text-black">
                {stat.value}
              </div>
              <div className="text-neutral-400 text-xs mt-1">
                {stat.label}
                {stat.href && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
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
          <h3 className="text-xs text-neutral-400 mb-3">
            Geçersiz Oyların Parti Dağılımı (Anonim)
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.invalidByParty.map((item) => (
              <Link
                key={item.party}
                href={`/islemler?status=invalid&party=${encodeURIComponent(item.party)}`}
                className="flex items-center gap-1.5 border border-neutral-200 px-3 py-1.5 hover:border-black hover:bg-neutral-50 transition-colors cursor-pointer group"
              >
                <div
                  className="w-2 h-2"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-black text-xs">{item.party}</span>
                <span className="text-neutral-400 text-xs">({item.count})</span>
                <span className="text-neutral-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ağırlıklandırma Metodolojisi */}
      {data.weighting && data.weighting.activeMethods.length > 0 && (
        <div className="mt-6 pt-6 border-t border-neutral-100">
          <h3 className="text-xs text-neutral-400 mb-3">Aktif Ağırlıklandırma Yöntemleri</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {data.weighting.activeMethods.map((method) => (
              <span key={method} className="text-xs border border-black text-black px-2 py-1">
                {METHOD_LABELS[method] || method}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-neutral-100 p-3">
              <p className="text-xs text-neutral-400">Efektif Örneklem</p>
              <p className="text-sm font-bold text-black">{data.weighting.effectiveSampleSize.toLocaleString('tr-TR')}</p>
            </div>
            {data.weighting.confidence && (
              <div className="border border-neutral-100 p-3">
                <p className="text-xs text-neutral-400">Hata Payı</p>
                <p className="text-sm font-bold text-black">±{data.weighting.confidence.marginOfError.toFixed(1)} puan</p>
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-4 leading-relaxed">
            Sonuçlar yaş, cinsiyet, eğitim ve bölge dağılımına göre ağırlıklandırılır.
            Oy kullanma niyeti düşük olan katılımcılar daha az ağırlık alır.
            Şüpheli hesaplar otomatik tespit edilerek sonuçlardan çıkarılır.
          </p>
        </div>
      )}
    </div>
  );
}
