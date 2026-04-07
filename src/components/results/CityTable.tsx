'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
      <h2 className="text-lg font-bold mb-1">
        {title || 'İl Bazlı Sıralama'}
      </h2>
      <p className="text-xs text-muted-foreground mb-6">
        Toplam {sorted.length} {columnLabel === 'İlçe' ? 'ilçe' : 'il'} — {sorted.reduce((s, c) => s + c.voteCount, 0).toLocaleString('tr-TR')} oy
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>{columnLabel || 'İl'}</TableHead>
              {!isActiveRound && (
                <TableHead>Önde Olan</TableHead>
              )}
              <TableHead className="text-right">
                {isActiveRound ? 'Katılım' : 'Toplam Oy'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((city, index) => (
              <motion.tr
                key={city.cityId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index < 15 ? index * 0.03 : 0 }}
                className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onCityClick?.(city.cityId)}
              >
                <TableCell className="text-muted-foreground tabular-nums">{index + 1}</TableCell>
                <TableCell className="font-medium">{city.cityName}</TableCell>
                {!isActiveRound && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: city.partyColor || '#d4d4d4' }}
                      />
                      <span className="text-muted-foreground text-sm">
                        {city.leadingParty || '-'}
                      </span>
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-right tabular-nums">
                  {(city.voteCount ?? 0).toLocaleString('tr-TR')}
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
      {hasMore && (
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
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
