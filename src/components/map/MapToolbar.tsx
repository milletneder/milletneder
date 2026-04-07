'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { ViewMode, DataMode } from '@/types/map';

interface MapToolbarProps {
  viewMode: ViewMode;
  dataMode: DataMode;
  distributeUndecided: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onDataModeChange: (mode: DataMode) => void;
  onDistributeUndecidedChange: (value: boolean) => void;
  isVisible: boolean;
  showDataToggles: boolean;
  isLoggedIn?: boolean;
  onVoteClick?: () => void;
}

function ToggleGroup({ children }: { children: React.ReactNode }) {
  return (
    <div data-slot="button-group" className="flex items-center">
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
           variant={active ? 'default' : 'ghost'}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export default function MapToolbar({
  viewMode,
  dataMode,
  distributeUndecided,
  onViewModeChange,
  onDataModeChange,
  onDistributeUndecidedChange,
  isVisible,
  showDataToggles,
  isLoggedIn,
  onVoteClick,
}: MapToolbarProps) {
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      setAtBottom(scrollTop + clientHeight >= scrollHeight - 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const shouldShow = isVisible && !atBottom;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: shouldShow ? 1 : 0,
        y: shouldShow ? 0 : 20,
      }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
      style={{ pointerEvents: shouldShow ? 'auto' : 'none' }}
    >
      <div className="bg-background border border-border shadow-lg rounded-lg flex items-center gap-2 px-2 h-12">
        {/* Login olmamış kullanıcı için Oy Ver butonu */}
        {!isLoggedIn && onVoteClick && (
          <Button onClick={onVoteClick}>
            Sonuçları görmek için Oy Ver
          </Button>
        )}

        {/* İl / İlçe toggle — sadece login olanlara */}
        {isLoggedIn && (
          <ToggleGroup>
            <ToggleButton active={viewMode === 'il'} onClick={() => onViewModeChange('il')}>
              İl
            </ToggleButton>
            <ToggleButton active={viewMode === 'ilce'} onClick={() => onViewModeChange('ilce')}>
              İlçe
            </ToggleButton>
          </ToggleGroup>
        )}

        {showDataToggles && (
          <>
            {/* Ham / Ağırlıklı toggle */}
            <ToggleGroup>
              <ToggleButton active={dataMode === 'raw'} onClick={() => onDataModeChange('raw')}>
                Ham
              </ToggleButton>
              <ToggleButton active={dataMode === 'weighted'} onClick={() => onDataModeChange('weighted')}>
                Ağırlıklı
              </ToggleButton>
            </ToggleGroup>

            {/* Kararsızları Dağıt */}
            <label className="flex items-center gap-2 px-2 cursor-pointer">
              <Checkbox
                checked={distributeUndecided}
                onCheckedChange={(v) => onDistributeUndecidedChange(v === true)}
              />
              <span className="text-xs font-medium select-none">Kararsızları Dağıt</span>
            </label>
          </>
        )}
      </div>
    </motion.div>
  );
}
