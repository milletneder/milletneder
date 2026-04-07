'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PartyResult {
  partyId: string;
  partyName: string;
  color: string;
  voteCount: number;
  percentage: number;
  delta?: number;
}

interface PartyBarsProps {
  results: PartyResult[];
  isActiveRound: boolean;
  onPartyClick?: (party: PartyResult) => void;
  title?: string;
}

export default function PartyBars({ results, isActiveRound, onPartyClick, title }: PartyBarsProps) {
  const hasWeighted = results.some(r => r.delta != null && r.delta !== 0);
  const sorted = [...results].sort((a, b) =>
    hasWeighted ? b.percentage - a.percentage : b.voteCount - a.voteCount
  );
  const maxValue = hasWeighted
    ? (sorted[0]?.percentage || 1)
    : (sorted[0]?.voteCount || 1);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold mb-6">
        {title || (isActiveRound ? 'Katılım Durumu' : 'Genel Sonuçlar')}
      </h2>
      {sorted.map((party, index) => (
        <motion.div
          key={party.partyId}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className={cn("group", onPartyClick && 'cursor-pointer')}
          onClick={() => onPartyClick?.(party)}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: party.color }}
              />
              <span className="font-medium text-sm">
                {party.partyName}
              </span>
            </div>
            {!isActiveRound && (
              <span className="font-bold text-sm tabular-nums">
                %{(party.percentage ?? 0).toFixed(1)}
              </span>
            )}
          </div>
          <div className="w-full bg-muted h-3 rounded-sm overflow-hidden">
            <motion.div
              className="h-full rounded-sm group-hover:brightness-110 transition-all"
              style={{ backgroundColor: party.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(hasWeighted ? party.percentage / maxValue : party.voteCount / maxValue) * 100}%` }}
              transition={{ duration: 0.8, delay: index * 0.05, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
