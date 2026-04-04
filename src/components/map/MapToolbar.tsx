'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    <div className="flex items-center border border-neutral-200">
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
    <button
      onClick={onClick}
      className={`px-3 h-8 text-xs font-medium transition-colors ${
        active
          ? 'bg-black text-white'
          : 'text-neutral-500 hover:text-black hover:bg-neutral-50'
      }`}
    >
      {children}
    </button>
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
      // 100px kala gizle
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
      <div className="bg-white border border-neutral-200 shadow-lg flex items-center gap-2 px-2 h-12">
        {/* Login olmamış kullanıcı için Oy Ver butonu */}
        {!isLoggedIn && onVoteClick && (
          <button
            onClick={onVoteClick}
            className="px-4 h-8 text-xs font-medium bg-black text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
          >
            Sonuçları görmek için Oy Ver
          </button>
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
            <button
              onClick={() => onDistributeUndecidedChange(!distributeUndecided)}
              className={`flex items-center gap-2 px-3 h-8 text-xs font-medium border transition-colors ${
                distributeUndecided
                  ? 'bg-black text-white border-black'
                  : 'text-neutral-500 hover:text-black border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <span className={`w-3.5 h-3.5 flex items-center justify-center border transition-colors ${
                distributeUndecided
                  ? 'bg-white border-white'
                  : 'border-neutral-300'
              }`}>
                {distributeUndecided && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              Kararsızları Dağıt
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
