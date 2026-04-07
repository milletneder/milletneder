'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

interface DistrictParty {
  party: string;
  color: string;
  count: number;
}

interface DistrictData {
  name: string;
  totalVotes: number;
  leadingParty: string;
  leadingColor: string;
  parties: DistrictParty[];
}

interface CityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  showPartyColors: boolean;
}

function slugify(name: string): string {
  return name
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function computeBounds(geojson: GeoJSON.FeatureCollection): { center: [number, number]; scale: number } {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;

  function processCoords(coords: number[]) {
    minLng = Math.min(minLng, coords[0]);
    maxLng = Math.max(maxLng, coords[0]);
    minLat = Math.min(minLat, coords[1]);
    maxLat = Math.max(maxLat, coords[1]);
  }

  function walkCoords(c: unknown) {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      processCoords(c as number[]);
    } else if (Array.isArray(c)) {
      for (const item of c) walkCoords(item);
    }
  }

  for (const feature of geojson.features) {
    if ('coordinates' in feature.geometry) {
      walkCoords(feature.geometry.coordinates);
    }
  }

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const spanLng = maxLng - minLng;
  const spanLat = maxLat - minLat;
  const span = Math.max(spanLng, spanLat);

  const scale = Math.min(60000, Math.max(3000, 120 / span * 1000));

  return { center: [centerLng, centerLat], scale };
}

function CityDetailModal({ isOpen, onClose, cityName, showPartyColors }: CityDetailModalProps) {
  const [districts, setDistricts] = useState<DistrictData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);

  const fetchData = useCallback(async () => {
    if (!cityName) return;
    setLoading(true);
    setGeoData(null);
    setDistricts([]);
    setHoveredDistrict(null);
    try {
      const [districtRes, geoRes] = await Promise.all([
        fetch(`/api/map/districts?city=${encodeURIComponent(cityName)}`),
        fetch(`/geo/districts/${slugify(cityName)}.json`),
      ]);
      if (districtRes.ok) {
        const data = await districtRes.json();
        setDistricts(data.districts || []);
      }
      if (geoRes.ok) {
        const geo = await geoRes.json();
        setGeoData(geo);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [cityName]);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  const districtLookup = useMemo(() => {
    const map = new Map<string, DistrictData>();
    districts.forEach((d) => map.set(d.name.toLowerCase(), d));
    return map;
  }, [districts]);

  const projectionConfig = useMemo(() => {
    if (!geoData) return { center: [35, 39] as [number, number], scale: 8000 };
    return computeBounds(geoData);
  }, [geoData]);

  const maxVotes = Math.max(...districts.map((d) => d.totalVotes), 1);

  const getFillColor = (districtName: string) => {
    const d = districtLookup.get(districtName.toLowerCase());
    if (!d) return '#f0f0f0';
    if (!showPartyColors) {
      const ratio = Math.min(d.totalVotes / maxVotes, 1);
      const value = Math.round(230 - ratio * 180);
      return `rgb(${value}, ${value}, ${value})`;
    }
    return d.leadingColor;
  };

  const hoveredData = hoveredDistrict
    ? districtLookup.get(hoveredDistrict.toLowerCase())
    : null;

  const totalCityVotes = districts.reduce((sum, d) => sum + d.totalVotes, 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-background w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-border rounded-xl shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-lg font-bold">{cityName}</h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                {totalCityVotes.toLocaleString('tr-TR')} toplam oy — {districts.length} ilçe
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-auto flex flex-col lg:flex-row">
            {/* Map */}
            <div className="flex-1 relative bg-muted/50" style={{ minHeight: '500px' }}>
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : geoData ? (
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{
                    center: projectionConfig.center,
                    scale: projectionConfig.scale,
                  }}
                  width={600}
                  height={500}
                  style={{ width: '100%', height: '100%' }}
                >
                  <Geographies geography={geoData}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const name = geo.properties.ibbs4_name ?? '';
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onMouseEnter={() => setHoveredDistrict(name)}
                            onMouseLeave={() => setHoveredDistrict(null)}
                            style={{
                              default: {
                                fill: getFillColor(name),
                                stroke: '#ffffff',
                                strokeWidth: 0.5,
                                outline: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              },
                              hover: {
                                fill: getFillColor(name),
                                stroke: '#ffffff',
                                strokeWidth: 0.5,
                                outline: 'none',
                                cursor: 'pointer',
                                opacity: 0.75,
                              },
                              pressed: {
                                fill: getFillColor(name),
                                stroke: '#ffffff',
                                strokeWidth: 0.5,
                                outline: 'none',
                                opacity: 0.6,
                              },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
              ) : null}

              {/* Hover info */}
              {hoveredDistrict && (
                <div className="absolute top-4 left-4 bg-popover text-popover-foreground border border-border px-4 py-3 shadow-lg rounded-lg z-10 min-w-[160px]">
                  <h3 className="font-semibold text-sm">{hoveredDistrict}</h3>
                  {hoveredData ? (
                    <div className="mt-1.5 space-y-1">
                      {hoveredData.parties.slice(0, 4).map((p) => (
                        <div key={p.party} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="text-muted-foreground text-xs flex-1">{p.party}</span>
                          <span className="text-muted-foreground text-xs tabular-nums">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs mt-1">Veri yok</p>
                  )}
                </div>
              )}
            </div>

            {/* District list */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border overflow-auto max-h-[40vh] lg:max-h-none">
              <div className="px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">İlçe Kırılımı</p>
              </div>
              <div className="divide-y divide-border/50">
                {districts.map((d) => (
                  <div
                    key={d.name}
                    className={`px-4 py-2.5 hover:bg-accent transition-colors ${
                      hoveredDistrict === d.name ? 'bg-accent' : ''
                    }`}
                    onMouseEnter={() => setHoveredDistrict(d.name)}
                    onMouseLeave={() => setHoveredDistrict(null)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{d.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {d.totalVotes.toLocaleString('tr-TR')} oy
                      </span>
                    </div>
                    {showPartyColors && d.parties.length > 0 && (
                      <div className="flex gap-0.5 mt-1.5 h-1.5 rounded-sm overflow-hidden">
                        {d.parties.map((p) => (
                          <div
                            key={p.party}
                            className="h-full"
                            style={{
                              backgroundColor: p.color,
                              width: `${(p.count / d.totalVotes) * 100}%`,
                              minWidth: '2px',
                            }}
                            title={`${p.party}: ${p.count}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {districts.length === 0 && !loading && (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    Bu il için henüz oy verisi yok
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default memo(CityDetailModal);
