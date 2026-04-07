'use client';

import { motion } from 'framer-motion';

interface PartyVote {
  party: string;
  color: string;
  count: number;
  percentage?: number;
}

interface CityTooltipProps {
  cityName: string;
  leadingParty?: string;
  partyColor?: string;
  voteCount: number;
  partyDistribution?: PartyVote[];
  position: { x: number; y: number };
  isActiveRound: boolean;
  isLoggedIn?: boolean;
}

export default function CityTooltip({
  cityName,
  voteCount,
  partyDistribution,
  position,
  isActiveRound,
  isLoggedIn,
}: CityTooltipProps) {
  const offsetX = 20;
  const offsetY = -80;

  const sorted = [...(partyDistribution ?? [])].sort((a, b) => (b.percentage ?? b.count) - (a.percentage ?? a.count));
  const top4 = sorted.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x + offsetX,
        top: position.y + offsetY,
      }}
    >
      <div className="bg-popover text-popover-foreground border border-border px-4 py-3 min-w-[180px] shadow-lg rounded-lg">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold text-sm tracking-wide">{cityName}</h3>
          <span className="text-muted-foreground text-xs tabular-nums">
            {(voteCount ?? 0).toLocaleString('tr-TR')} oy
          </span>
        </div>

        {!isActiveRound && top4.length > 0 ? (
          <div className="mt-2 space-y-1">
            {top4.map((p) => (
              <div key={p.party} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-muted-foreground text-xs flex-1">{p.party}</span>
                {isLoggedIn ? (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    %{(p.percentage ?? 0).toFixed(1)}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {p.count.toLocaleString('tr-TR')}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : isActiveRound ? null : (
          <p className="text-muted-foreground text-xs mt-1">Veri yok</p>
        )}
      </div>
    </motion.div>
  );
}
