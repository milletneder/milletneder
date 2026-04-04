'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface CityData {
  cityId: string;
  cityName: string;
  voteCount: number;
  leadingParty?: string;
  partyColor?: string;
}

interface CityTableProps {
  cities: CityData[];
  isActiveRound: boolean;
  onCityClick?: (city: string) => void;
  title?: string;
  columnLabel?: string;
}

export default function CityTable({ cities, isActiveRound, onCityClick, title, columnLabel }: CityTableProps) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...cities].sort((a, b) => b.voteCount - a.voteCount);
  const displayData = showAll ? sorted : sorted.slice(0, 15);
  const hasMore = sorted.length > 15;

  return (
    <div>
      <h2 className="text-lg font-bold text-black mb-1">
        {title || 'İl Bazlı Sıralama'}
      </h2>
      <p className="text-xs text-neutral-400 mb-6">
        Toplam {sorted.length} {columnLabel === 'İlçe' ? 'ilçe' : 'il'} — {sorted.reduce((s, c) => s + c.voteCount, 0).toLocaleString('tr-TR')} oy
      </p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left text-neutral-400 text-[11px] py-3 px-2">#</th>
              <th className="text-left text-neutral-400 text-[11px] py-3 px-2">{columnLabel || 'İl'}</th>
              {!isActiveRound && (
                <th className="text-left text-neutral-400 text-[11px] py-3 px-2">Önde Olan</th>
              )}
              <th className="text-right text-neutral-400 text-[11px] py-3 px-2">
                {isActiveRound ? 'Katılım' : 'Toplam Oy'}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((city, index) => (
              <motion.tr
                key={city.cityId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index < 15 ? index * 0.03 : 0 }}
                className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors"
                onClick={() => onCityClick?.(city.cityId)}
              >
                <td className="py-3 px-2 text-neutral-400 text-sm tabular-nums">{index + 1}</td>
                <td className="py-3 px-2 text-black font-medium text-sm">{city.cityName}</td>
                {!isActiveRound && (
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2"
                        style={{ backgroundColor: city.partyColor || '#d4d4d4' }}
                      />
                      <span className="text-neutral-600 text-sm">
                        {city.leadingParty || '-'}
                      </span>
                    </div>
                  </td>
                )}
                <td className="py-3 px-2 text-right text-black tabular-nums text-sm">
                  {(city.voteCount ?? 0).toLocaleString('tr-TR')}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 w-full py-3 text-xs font-medium text-neutral-500 hover:text-black border border-neutral-200 hover:border-neutral-400 transition-colors"
        >
          {showAll ? 'Daha az göster' : `Tümünü göster (${sorted.length})`}
        </button>
      )}
    </div>
  );
}
