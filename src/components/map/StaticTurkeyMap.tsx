'use client';

import { useState, useCallback, memo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps';

const TURKEY_GEO_URL =
  'https://raw.githubusercontent.com/cihadturhan/tr-geojson/master/geo/tr-cities-utf8.json';

interface CityColorData {
  cityName: string;
  color: string;
  party: string;
  percentage?: number;
}

interface StaticTurkeyMapProps {
  cityColors: CityColorData[];
}

function StaticTurkeyMap({ cityColors }: StaticTurkeyMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    name: string;
    party: string;
    color: string;
    pct?: number;
    x: number;
    y: number;
  } | null>(null);

  const lookup = new Map<string, CityColorData>();
  cityColors.forEach((c) => {
    lookup.set(c.cityName.toLowerCase(), c);
  });

  const getFill = useCallback(
    (name: string) => {
      const data = lookup.get(name.toLowerCase());
      return data?.color || '#e5e5e5';
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cityColors],
  );

  return (
    <div className="relative w-full overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [35.5, 39.0],
          scale: 2200,
        }}
        width={800}
        height={370}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <Geographies
          geography={TURKEY_GEO_URL}
          parseGeographies={(geos) => {
            setIsLoading(false);
            return geos;
          }}
        >
          {({ geographies }) =>
            geographies.map((geo) => {
              const name = geo.properties.name ?? '';
              const fill = getFill(name);

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(evt) => {
                    const data = lookup.get(name.toLowerCase());
                    if (data) {
                      const e = evt as unknown as React.MouseEvent;
                      setTooltip({
                        name,
                        party: data.party,
                        color: data.color,
                        pct: data.percentage,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    default: {
                      fill,
                      stroke: '#ffffff',
                      strokeWidth: 0.6,
                      outline: 'none',
                      transition: 'opacity 0.15s',
                    },
                    hover: {
                      fill,
                      stroke: '#ffffff',
                      strokeWidth: 0.6,
                      outline: 'none',
                      opacity: 0.75,
                    },
                    pressed: {
                      fill,
                      stroke: '#ffffff',
                      strokeWidth: 0.6,
                      outline: 'none',
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <div className="bg-black text-white px-3 py-2 text-xs">
            <div className="font-bold">{tooltip.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2" style={{ backgroundColor: tooltip.color }} />
              <span>{tooltip.party}</span>
              {tooltip.pct != null && (
                <span className="text-neutral-400">%{tooltip.pct.toFixed(1)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(StaticTurkeyMap);
