'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
  city: string;
  label?: string;
  district?: string;
  voteCount: number;
  voterCount: number;
  representationPct: number;
}

interface ParticipationLeaderboardProps {
  entries: LeaderboardEntry[];
  title?: string;
  subtitle?: string;
}

function formatPct(pct: number): string {
  if (pct >= 1) return pct.toFixed(1);
  if (pct >= 0.1) return pct.toFixed(2);
  if (pct >= 0.01) return pct.toFixed(3);
  if (pct >= 0.001) return pct.toFixed(4);
  if (pct > 0) return pct.toFixed(5);
  return '0';
}

export default function ParticipationLeaderboard({ entries, title, subtitle }: ParticipationLeaderboardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const sorted = [...entries].sort((a, b) => b.representationPct - a.representationPct);
  const maxPct = sorted[0]?.representationPct || 1;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-lg font-bold text-black">
          {title || 'Temsil Oranı Sıralaması'}
        </h2>
        <div className="relative">
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="w-5 h-5 rounded-full border border-neutral-300 text-neutral-400 text-xs flex items-center justify-center hover:border-neutral-500 hover:text-neutral-600 transition-colors"
          >
            ?
          </button>
          {showTooltip && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-7 w-72 bg-black text-white text-xs rounded-none px-4 py-3 z-50 shadow-xl leading-relaxed">
              <div className="font-semibold mb-1">Bu sıralama nasıl hesaplanır?</div>
              <p>
                Her ilin toplam oy sayısı, YSK kayıtlı seçmen sayısına bölünerek
                temsil oranı hesaplanır. Böylece büyük illerin ham oy avantajı
                ortadan kalkar ve küçük illerin katılım başarısı görünür olur.
              </p>
              <p className="mt-1.5 text-neutral-400">
                Örnek: 100.000 seçmenli bir ilde 50 oy → ‰0.5 temsil oranı
              </p>
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-black rotate-45" />
            </div>
          )}
        </div>
      </div>
      <p className="text-neutral-400 text-xs mb-6">
        {subtitle || 'İl seçmen sayısına oranla katılım — YSK kayıtlı seçmen verilerine göre'}
      </p>

      <div className="space-y-3">
        {(showAllEntries ? sorted : sorted.slice(0, 15)).map((entry, index) => {
          const barPct = Math.min((entry.representationPct / maxPct) * 100, 100);
          const entryKey = entry.district ? `${entry.city}|${entry.district}` : entry.city;
          const displayName = entry.label || entry.city;
          const isActive = activeCity === entryKey;
          return (
            <motion.div
              key={entryKey}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              className="relative"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-neutral-400 text-xs w-6 flex-shrink-0 text-right tabular-nums">
                    {`${index + 1}.`}
                  </span>
                  <span className="text-black font-medium text-sm truncate">{displayName}</span>
                </div>
                <span className="text-black font-bold text-xs tabular-nums flex-shrink-0 ml-2">
                  ‰{formatPct(entry.representationPct * 10)}
                </span>
              </div>
              <div
                className="w-full bg-neutral-100 h-3 overflow-hidden cursor-pointer"
                onClick={() => setActiveCity(isActive ? null : entryKey)}
                onMouseEnter={() => setActiveCity(entryKey)}
                onMouseLeave={() => setActiveCity(null)}
              >
                <motion.div
                  className="h-full bg-black"
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.6, delay: index * 0.04 }}
                />
              </div>
              {isActive && (
                <div className="absolute right-0 mt-1 bg-black text-white text-xs rounded-none px-3 py-2 z-40 shadow-lg whitespace-nowrap">
                  <span className="text-neutral-400">Oy:</span>{' '}
                  {entry.voteCount.toLocaleString('tr-TR')}
                  <span className="mx-2 text-neutral-600">|</span>
                  <span className="text-neutral-400">Seçmen:</span>{' '}
                  {entry.voterCount.toLocaleString('tr-TR')}
                  <div className="absolute right-4 -top-1.5 w-3 h-3 bg-black rotate-45" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      {sorted.length > 15 && (
        <button
          onClick={() => setShowAllEntries(!showAllEntries)}
          className="mt-4 w-full py-3 text-xs font-medium text-neutral-500 hover:text-black border border-neutral-200 hover:border-neutral-400 transition-colors"
        >
          {showAllEntries ? 'Daha az göster' : `Tümünü göster (${sorted.length})`}
        </button>
      )}
    </div>
  );
}
