'use client';

import { motion } from 'framer-motion';

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
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm group"
        >
          <svg
            className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Turkiye
        </button>
        <div className="w-px h-4 bg-gray-700" />
        <h2 className="text-white font-semibold text-lg">
          {cityName}
          <span className="text-gray-500 font-normal text-sm ml-2">
            ({cityId})
          </span>
        </h2>
      </div>

      {/* District list */}
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center h-48 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <p className="text-gray-500 text-sm">
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
              className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition-colors"
            >
              {/* District name + party */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white text-sm font-medium truncate pr-2">
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
                    <span className="text-gray-400 text-xs font-medium">
                      {district.leadingParty}
                    </span>
                  </span>
                )}
              </div>

              {/* Vote bar */}
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
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
              <p className="text-gray-500 text-xs mt-1.5">
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
