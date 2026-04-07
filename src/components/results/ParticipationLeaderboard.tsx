'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const sorted = [...entries].sort((a, b) => b.representationPct - a.representationPct);
  const maxPct = sorted[0]?.representationPct || 1;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-lg font-bold">
          {title || 'Temsil Oranı Sıralaması'}
        </h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <HelpCircle className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">Bu sıralama nasıl hesaplanır?</p>
            <p className="text-xs">
              Her ilin toplam oy sayısı, YSK kayıtlı seçmen sayısına bölünerek
              temsil oranı hesaplanır. Böylece büyük illerin ham oy avantajı
              ortadan kalkar ve küçük illerin katılım başarısı görünür olur.
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              Örnek: 100.000 seçmenli bir ilde 50 oy = ‰0.5 temsil oranı
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-muted-foreground text-xs mb-6">
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
                  <span className="text-muted-foreground text-xs w-6 shrink-0 text-right tabular-nums">
                    {`${index + 1}.`}
                  </span>
                  <span className="font-medium text-sm truncate">{displayName}</span>
                </div>
                <span className="font-bold text-xs tabular-nums shrink-0 ml-2">
                  ‰{formatPct(entry.representationPct * 10)}
                </span>
              </div>
              <div
                className="w-full bg-muted h-3 rounded-sm overflow-hidden cursor-pointer"
                onClick={() => setActiveCity(isActive ? null : entryKey)}
                onMouseEnter={() => setActiveCity(entryKey)}
                onMouseLeave={() => setActiveCity(null)}
              >
                <motion.div
                  className="h-full bg-primary rounded-sm"
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.6, delay: index * 0.04 }}
                />
              </div>
              {isActive && (
                <div className="absolute right-0 mt-1 bg-popover text-popover-foreground border border-border text-xs rounded-lg px-3 py-2 z-40 shadow-lg whitespace-nowrap">
                  <span className="text-muted-foreground">Oy:</span>{' '}
                  {entry.voteCount.toLocaleString('tr-TR')}
                  <span className="mx-2 text-border">|</span>
                  <span className="text-muted-foreground">Seçmen:</span>{' '}
                  {entry.voterCount.toLocaleString('tr-TR')}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      {sorted.length > 15 && (
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => setShowAllEntries(!showAllEntries)}
        >
          {showAllEntries ? (
            <>
              <ChevronUp className="size-3.5" data-icon="inline-start" />
              Daha az göster
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" data-icon="inline-start" />
              Tümünü göster ({sorted.length})
            </>
          )}
        </Button>
      )}
    </div>
  );
}
