'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft } from 'lucide-react';

export interface DistrictResult {
  districtName: string;
  leadingParty?: string;
  partyColor?: string;
  voteCount: number;
  totalVotes?: number;
}

interface DistrictMapProps {
  cityId: string;
  cityName: string;
  districtData: DistrictResult[];
  onBack: () => void;
}

// Compute bar width as a percentage of the max vote count
function getBarWidth(count: number, max: number): string {
  if (max === 0) return '0%';
  return `${Math.max((count / max) * 100, 4)}%`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export default function DistrictMap({
  cityId,
  cityName,
  districtData,
  onBack,
}: DistrictMapProps) {
  const maxVotes = Math.max(...districtData.map((d) => d.voteCount), 1);

  // Sort districts by vote count descending
  const sorted = [...districtData].sort((a, b) => b.voteCount - a.voteCount);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
                   onClick={onBack}
          className="text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          Türkiye
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <h2 className="text-foreground font-semibold text-lg">
          {cityName}
          <span className="text-muted-foreground font-normal text-sm ml-2">
            ({cityId})
          </span>
        </h2>
      </div>

      {/* District list */}
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center h-48 bg-muted/50 rounded-xl border border-border">
          <p className="text-muted-foreground text-sm">
            Bu il için ilçe verisi bulunamadı.
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {sorted.map((district) => (
            <motion.div
              key={district.districtName}
              variants={itemVariants}
              className="bg-muted/50 border border-border rounded-xl p-4 hover:border-foreground/20 transition-colors"
            >
              {/* District name + party */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-foreground text-sm font-medium truncate pr-2">
                  {district.districtName}
                </h3>
                {district.leadingParty && (
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: district.partyColor ?? '#6b7280',
                      }}
                    />
                    <span className="text-muted-foreground text-xs font-medium">
                      {district.leadingParty}
                    </span>
                  </span>
                )}
              </div>

              {/* Vote bar */}
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: getBarWidth(district.voteCount, maxVotes) }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    backgroundColor: district.partyColor ?? '#10b981',
                  }}
                />
              </div>

              {/* Vote count */}
              <p className="text-muted-foreground text-xs mt-1.5">
                {district.voteCount.toLocaleString('tr-TR')} oy
                {district.totalVotes
                  ? ` / ${district.totalVotes.toLocaleString('tr-TR')}`
                  : ''}
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
