'use client';

import { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps';
import { AnimatePresence } from 'framer-motion';
import CityTooltip from './CityTooltip';
import type { ViewMode } from '@/types/map';

const TURKEY_GEO_URL =
  'https://raw.githubusercontent.com/cihadturhan/tr-geojson/master/geo/tr-cities-utf8.json';

const ALL_DISTRICTS_GEO_URL = '/geo/all-districts.json';

export interface PartyVote {
  party: string;
  color: string;
  count: number;
  percentage?: number;
}

export interface CityResult {
  cityId: string;
  cityName: string;
  leadingParty?: string;
  partyColor?: string;
  voteCount: number;
  totalVotes?: number;
  partyDistribution?: PartyVote[];
}

export interface DistrictData {
  name: string;
  city?: string;
  totalVotes: number;
  leadingParty: string;
  leadingColor: string;
  parties: PartyVote[];
}

interface TurkeyMapProps {
  cityData: CityResult[];
  isActiveRound: boolean;
  selectedCity: string | null;
  onCityClick: (cityId: string, cityName: string) => void;
  onBack: () => void;
  onDistrictsLoaded: (districts: DistrictData[]) => void;
  showPartyColors: boolean;
  isLoggedIn?: boolean;
  viewMode: ViewMode;
  allDistrictsData?: DistrictData[];
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

// GeoJSON ↔ DB il isim eşleştirme (farklı kaynaklardaki isim uyumsuzlukları)
const CITY_NAME_ALIASES: Record<string, string> = {
  'afyon': 'afyonkarahisar',
  'hakkari': 'hakkâri',
};

function normalizeCityName(name: string): string {
  const lower = name.toLowerCase();
  return CITY_NAME_ALIASES[lower] || lower;
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

  const scaleByLng = 800 / spanLng * 50;
  const scaleByLat = 450 / spanLat * 50;
  const scale = Math.min(scaleByLng, scaleByLat) * 0.85;

  return { center: [centerLng, centerLat], scale };
}

function getIntensityColor(voteCount: number, maxVotes: number): string {
  if (maxVotes === 0) return '#e5e5e5';
  const ratio = Math.min(voteCount / maxVotes, 1);
  const value = Math.round(230 - ratio * 180);
  return `rgb(${value}, ${value}, ${value})`;
}

function getPartyColor(party?: string): string {
  if (!party) return '#d4d4d4';
  return '#d4d4d4';
}

// Shuffle array and assign stagger delays
function makeStaggerDelays(names: string[], maxDelay: number): Map<string, number> {
  const map = new Map<string, number>();
  const shuffled = [...names].sort(() => Math.random() - 0.5);
  shuffled.forEach((name, i) => {
    map.set(name, (i / Math.max(shuffled.length - 1, 1)) * maxDelay);
  });
  return map;
}

const STAGGER_DURATION = 300;
const ITEM_FADE = 200;
const TOTAL_ANIM = STAGGER_DURATION + ITEM_FADE + 40;
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';
const EASE_OUT = 'cubic-bezier(0, 0, 0.2, 1)';

function TurkeyMap({
  cityData,
  isActiveRound,
  selectedCity,
  onCityClick,
  onBack,
  onDistrictsLoaded,
  showPartyColors,
  isLoggedIn,
  viewMode,
  allDistrictsData,
}: TurkeyMapProps) {
  const [tooltip, setTooltip] = useState<{
    cityName: string;
    leadingParty?: string;
    partyColor?: string;
    voteCount: number;
    partyDistribution?: PartyVote[];
    x: number;
    y: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // District geo/data (per-city drill-down)
  const [districtGeo, setDistrictGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [districts, setDistricts] = useState<DistrictData[]>([]);

  // All-districts GeoJSON (ilçe view — national)
  const [allDistrictsGeo, setAllDistrictsGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const allDistrictsGeoLoadedRef = useRef(false);

  // Animation state
  const [turkeyShow, setTurkeyShow] = useState(false);
  const [districtShow, setDistrictShow] = useState(false);

  const turkeyDelaysRef = useRef<Map<string, number>>(new Map());
  const districtDelaysRef = useRef<Map<string, number>>(new Map());
  const turkeyNamesRef = useRef<string[]>([]);

  type Phase = 'loading' | 'entering-turkey' | 'idle'
    | 'hiding-turkey' | 'waiting-data' | 'entering-district' | 'district'
    | 'hiding-district' | 'returning-turkey';
  const [phase, setPhase] = useState<Phase>('loading');
  const phaseRef = useRef<Phase>('loading');
  phaseRef.current = phase;

  const pendingRef = useRef<{ geo: GeoJSON.FeatureCollection; districts: DistrictData[] } | null>(null);
  const activeCityRef = useRef<string | null>(null);

  // ─── Lazy load GeoJSON files ───
  useEffect(() => {
    if (viewMode !== 'ilce' || allDistrictsGeoLoadedRef.current) return;
    allDistrictsGeoLoadedRef.current = true;
    fetch(ALL_DISTRICTS_GEO_URL)
      .then(r => r.ok ? r.json() : null)
      .then(geo => { if (geo) setAllDistrictsGeo(geo); })
      .catch(() => {});
  }, [viewMode]);


  // ─── All-districts lookup for ilce view ───
  const allDistrictLookup = useMemo(() => {
    if (!allDistrictsData) return new Map<string, DistrictData>();
    const map = new Map<string, DistrictData>();
    for (const d of allDistrictsData) {
      const key = `${(d.city || '').toLowerCase()}|${d.name.toLowerCase()}`;
      map.set(key, d);
      map.set(d.name.toLowerCase(), d);
    }
    return map;
  }, [allDistrictsData]);

  // ─── Initial entrance: turkey geographies parsed → stagger in + bölge GeoJSON oluştur ───
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleGeoParsed = useCallback((geos: any[]) => {
    setIsLoading(false);
    if (turkeyNamesRef.current.length === 0) {
      const names = (geos as Array<{ properties: { name?: string } }>).map(g => g.properties.name ?? '');
      turkeyNamesRef.current = names;
      turkeyDelaysRef.current = makeStaggerDelays(names, STAGGER_DURATION);
      setPhase('entering-turkey');
    }
    return geos;
  }, []);

  // entering-turkey or returning-turkey: trigger show after mount
  useEffect(() => {
    if (phase !== 'entering-turkey' && phase !== 'returning-turkey') return;
    const t = setTimeout(() => setTurkeyShow(true), 30);
    return () => clearTimeout(t);
  }, [phase]);

  // entering-turkey → idle after animation completes
  useEffect(() => {
    if (phase !== 'entering-turkey') return;
    const t = setTimeout(() => setPhase('idle'), TOTAL_ANIM + 30);
    return () => clearTimeout(t);
  }, [phase]);

  // ─── City click: hide turkey + fetch district data ───
  useEffect(() => {
    if (!selectedCity || selectedCity === activeCityRef.current) return;
    if (phase !== 'idle') return;
    activeCityRef.current = selectedCity;
    pendingRef.current = null;

    turkeyDelaysRef.current = makeStaggerDelays(turkeyNamesRef.current, STAGGER_DURATION);
    setTurkeyShow(false);
    setPhase('hiding-turkey');

    Promise.all([
      fetch(`/api/map/districts?city=${encodeURIComponent(selectedCity)}`).then(r => r.ok ? r.json() : null),
      fetch(`/geo/districts/${slugify(selectedCity)}.json`).then(r => r.ok ? r.json() : null),
    ]).then(([dData, geo]) => {
      pendingRef.current = { geo, districts: dData?.districts || [] };
      if (phaseRef.current === 'waiting-data') {
        applyPendingDistrict();
      }
    }).catch(() => {
      pendingRef.current = null;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  const applyPendingDistrict = useCallback(() => {
    const data = pendingRef.current;
    if (!data) return;
    const { geo, districts: d } = data;
    setDistricts(d);
    setDistrictGeo(geo);
    onDistrictsLoaded(d);

    const names = geo?.features?.map((f: GeoJSON.Feature) =>
      (f.properties as Record<string, string>)?.ibbs4_name ?? ''
    ).filter(Boolean) || [];
    districtDelaysRef.current = makeStaggerDelays(names, STAGGER_DURATION);

    setDistrictShow(false);
    setPhase('entering-district');
    pendingRef.current = null;
  }, [onDistrictsLoaded]);

  useEffect(() => {
    if (phase !== 'entering-district' || !districtGeo) return;
    const t = setTimeout(() => setDistrictShow(true), 30);
    return () => clearTimeout(t);
  }, [phase, districtGeo]);

  useEffect(() => {
    if (phase !== 'hiding-turkey') return;
    const t = setTimeout(() => {
      if (pendingRef.current) {
        applyPendingDistrict();
      } else {
        setPhase('waiting-data');
      }
    }, TOTAL_ANIM);
    return () => clearTimeout(t);
  }, [phase, applyPendingDistrict]);

  useEffect(() => {
    if (phase !== 'entering-district') return;
    const t = setTimeout(() => setPhase('district'), TOTAL_ANIM);
    return () => clearTimeout(t);
  }, [phase]);

  // ─── Back button ───
  const handleBack = useCallback(() => {
    if (phase !== 'district') return;
    setTooltip(null);
    activeCityRef.current = null;

    const names = districtGeo?.features?.map((f: GeoJSON.Feature) =>
      (f.properties as Record<string, string>)?.ibbs4_name ?? ''
    ).filter(Boolean) || [];
    districtDelaysRef.current = makeStaggerDelays(names, STAGGER_DURATION);
    setDistrictShow(false);
    setPhase('hiding-district');
  }, [phase, districtGeo]);

  useEffect(() => {
    if (phase !== 'hiding-district') return;
    const t = setTimeout(() => {
      setDistrictGeo(null);
      setDistricts([]);
      turkeyDelaysRef.current = makeStaggerDelays(turkeyNamesRef.current, STAGGER_DURATION);
      setTurkeyShow(false);
      setPhase('returning-turkey');
    }, TOTAL_ANIM);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'returning-turkey') return;
    const t = setTimeout(() => {
      setPhase('idle');
      onBack();
    }, TOTAL_ANIM + 30);
    return () => clearTimeout(t);
  }, [phase, onBack]);

  // ─── Lookups ───
  const cityLookup = useMemo(() => {
    const map = new Map<string, CityResult>();
    cityData.forEach((c) => {
      map.set(normalizeCityName(c.cityName), c);
      map.set(c.cityName.toLowerCase(), c);
      map.set(c.cityId, c);
    });
    return map;
  }, [cityData]);

  const districtLookup = useMemo(() => {
    const map = new Map<string, DistrictData>();
    districts.forEach((d) => map.set(d.name.toLowerCase(), d));
    return map;
  }, [districts]);

  const maxVotes = Math.max(...cityData.map((c) => c.voteCount), 1);
  const maxDistrictVotes = Math.max(...districts.map((d) => d.totalVotes), 1);
  const maxAllDistrictVotes = useMemo(() => {
    if (!allDistrictsData) return 1;
    return Math.max(...allDistrictsData.map(d => d.totalVotes), 1);
  }, [allDistrictsData]);

  const districtProjection = useMemo(() => {
    if (!districtGeo) return { center: [35, 39] as [number, number], scale: 8000 };
    return computeBounds(districtGeo);
  }, [districtGeo]);

  // ─── Fill color ───
  const getCityFillColor = useCallback(
    (geoName: string) => {
      const data = cityLookup.get(normalizeCityName(geoName));
      if (!data) return '#f0f0f0';
      if (isActiveRound) return getIntensityColor(data.voteCount, maxVotes);
      return data.partyColor ?? getPartyColor(data.leadingParty);
    },
    [cityLookup, isActiveRound, maxVotes],
  );

  const getDistrictFillColor = useCallback(
    (districtName: string) => {
      const d = districtLookup.get(districtName.toLowerCase());
      if (!d) return '#f0f0f0';
      if (!showPartyColors) return getIntensityColor(d.totalVotes, maxDistrictVotes);
      return d.leadingColor;
    },
    [districtLookup, showPartyColors, maxDistrictVotes],
  );

  const getAllDistrictFillColor = useCallback(
    (districtName: string, cityName: string) => {
      const key = `${cityName.toLowerCase()}|${districtName.toLowerCase()}`;
      const d = allDistrictLookup.get(key) || allDistrictLookup.get(districtName.toLowerCase());
      if (!d) return '#f0f0f0';
      if (isActiveRound) return getIntensityColor(d.totalVotes, maxAllDistrictVotes);
      return d.leadingColor || '#d4d4d4';
    },
    [allDistrictLookup, isActiveRound, maxAllDistrictVotes],
  );

  // ─── Event handlers ───
  const handleMouseEnter = useCallback(
    (geo: { properties: Record<string, string> }, evt: React.MouseEvent) => {
      if (phase !== 'idle' && phase !== 'district') return;

      if (districtGeo) {
        const name = geo.properties.ibbs4_name ?? '';
        const d = districtLookup.get(name.toLowerCase());
        setTooltip({
          cityName: name,
          leadingParty: d?.leadingParty,
          partyColor: d?.leadingColor,
          voteCount: d?.totalVotes ?? 0,
          partyDistribution: d?.parties,
          x: evt.clientX,
          y: evt.clientY,
        });
        return;
      }

      if (viewMode === 'ilce') {
        const districtName = geo.properties.ibbs4_name ?? '';
        const cityName = geo.properties.ibbs3_name ?? '';
        const key = `${cityName.toLowerCase()}|${districtName.toLowerCase()}`;
        const d = allDistrictLookup.get(key) || allDistrictLookup.get(districtName.toLowerCase());
        setTooltip({
          cityName: `${districtName} (${cityName})`,
          leadingParty: d?.leadingParty,
          partyColor: d?.leadingColor,
          voteCount: d?.totalVotes ?? 0,
          partyDistribution: d?.parties,
          x: evt.clientX,
          y: evt.clientY,
        });
        return;
      }

      // İl view
      const name = geo.properties.name ?? '';
      const data = cityLookup.get(normalizeCityName(name));
      setTooltip({
        cityName: data?.cityName ?? name,
        leadingParty: data?.leadingParty,
        partyColor: data?.partyColor ?? getPartyColor(data?.leadingParty),
        voteCount: data?.voteCount ?? 0,
        partyDistribution: data?.partyDistribution,
        x: evt.clientX,
        y: evt.clientY,
      });
    },
    [cityLookup, districtLookup, allDistrictLookup, districtGeo, phase, viewMode],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // ─── Derived state ───
  const isInteractive = phase === 'idle' || phase === 'district';
  const showBackButton = phase === 'district' || phase === 'entering-district';
  const showCityInfo = phase === 'district' || phase === 'entering-district';

  const isCityClickable = viewMode === 'il';

  if (hasError) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-background">
        <p className="text-muted-foreground text-sm">Harita yüklenemedi. Sayfayı yenileyin.</p>
      </div>
    );
  }

  // Layer visibility
  const showAllDistrictsLayer = viewMode === 'ilce' && !districtGeo;
  const showCityLayer = viewMode === 'il' && !districtGeo;

  return (
    <div className="relative w-full aspect-[5/3] md:aspect-auto md:h-full overflow-hidden">
      {/* Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Overlay bar */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="max-w-screen-2xl mx-auto px-6 pt-4 flex items-start justify-between">
          <button
            onClick={handleBack}
            className="pointer-events-auto bg-background border border-border rounded-md px-3 py-1.5 text-xs font-medium hover:border-foreground/30 flex items-center gap-1.5 transition-colors"
            style={{
              opacity: showBackButton ? 1 : 0,
              pointerEvents: showBackButton ? 'auto' : 'none',
              transition: 'opacity 0.4s ease',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 9L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Türkiye
          </button>

          <div
            className="text-right"
            style={{
              opacity: showCityInfo ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          >
            <h2 className="text-lg font-bold">{selectedCity}</h2>
            <p className="text-xs text-muted-foreground">
              {districts.reduce((s, d) => s + d.totalVotes, 0).toLocaleString('tr-TR')} oy — {districts.length} ilçe
            </p>
          </div>
        </div>
      </div>

      {/* ── City layer (il view — 81 cities) ── */}
      {showCityLayer && (
        <div
          className="absolute inset-0"
          style={{ pointerEvents: phase === 'idle' ? 'auto' : 'none' }}
        >
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [35.5, 39.0], scale: 2800 }}
            width={1000}
            height={600}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          >
            <Geographies geography={TURKEY_GEO_URL} parseGeographies={handleGeoParsed}>
              {({ geographies }) => {
                if (geographies.length === 0 && !isLoading) setHasError(true);
                return geographies.map((geo) => {
                  const name = geo.properties.name ?? '';
                  const fill = getCityFillColor(name);
                  const delay = turkeyDelaysRef.current.get(name) ?? 0;
                  const visible = turkeyShow;
                  const easing = visible ? EASE_OUT : EASE_IN;
                  const clickable = isInteractive && isCityClickable;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(evt) => handleMouseEnter(geo, evt as unknown as React.MouseEvent)}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => {
                        if (!clickable) return;
                        const data = cityLookup.get(normalizeCityName(name));
                        onCityClick(data?.cityId ?? '', data?.cityName ?? name);
                      }}
                      style={{
                        default: {
                          fill,
                          stroke: '#ffffff',
                          strokeWidth: 0.8,
                          outline: 'none',
                          cursor: clickable ? 'pointer' : 'default',
                          opacity: visible ? 1 : 0,
                          transition: `opacity ${ITEM_FADE}ms ${easing} ${delay}ms`,
                        },
                        hover: {
                          fill,
                          stroke: '#ffffff',
                          strokeWidth: 0.8,
                          outline: 'none',
                          cursor: clickable ? 'pointer' : 'default',
                          opacity: visible ? 0.8 : 0,
                          transition: `opacity ${ITEM_FADE}ms ${easing} ${delay}ms`,
                        },
                        pressed: {
                          fill,
                          stroke: '#ffffff',
                          strokeWidth: 0.8,
                          outline: 'none',
                          opacity: visible ? 1 : 0,
                          transition: `opacity ${ITEM_FADE}ms ${easing} ${delay}ms`,
                        },
                      }}
                    />
                  );
                });
              }}
            </Geographies>
          </ComposableMap>
        </div>
      )}

      {/* ── All-districts layer (ilçe view — national) ── */}
      {showAllDistrictsLayer && allDistrictsGeo && (
        <div
          className="absolute inset-0"
          style={{ pointerEvents: phase === 'idle' ? 'auto' : 'none' }}
        >
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [35.5, 39.0], scale: 2800 }}
            width={1000}
            height={600}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          >
            <Geographies geography={allDistrictsGeo}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const districtName = geo.properties.ibbs4_name ?? '';
                  const cityName = geo.properties.ibbs3_name ?? '';
                  const fill = getAllDistrictFillColor(districtName, cityName);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(evt) => handleMouseEnter(geo, evt as unknown as React.MouseEvent)}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => {
                        if (!isInteractive) return;
                        const data = cityLookup.get(cityName.toLowerCase());
                        onCityClick(data?.cityId ?? '', cityName);
                      }}
                      style={{
                        default: {
                          fill,
                          stroke: '#ffffff',
                          strokeWidth: 0.2,
                          outline: 'none',
                          cursor: isInteractive ? 'pointer' : 'default',
                          opacity: 1,
                        },
                        hover: {
                          fill,
                          stroke: '#ffffff',
                          strokeWidth: 0.2,
                          outline: 'none',
                          cursor: isInteractive ? 'pointer' : 'default',
                          opacity: 0.8,
                        },
                        pressed: {
                          fill,
                          stroke: '#ffffff',
                          strokeWidth: 0.2,
                          outline: 'none',
                          opacity: 0.65,
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>
      )}

      {/* Loading indicator for ilce GeoJSON */}
      {showAllDistrictsLayer && !allDistrictsGeo && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── District map layer (per-city drill-down) ── */}
      {districtGeo && (
        <div
          className="absolute inset-0"
          style={{ pointerEvents: phase === 'district' ? 'auto' : 'none' }}
        >
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              center: districtProjection.center,
              scale: districtProjection.scale,
            }}
            width={800}
            height={450}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          >
            <Geographies geography={districtGeo}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties.ibbs4_name ?? '';
                  const fill = getDistrictFillColor(name);
                  const delay = districtDelaysRef.current.get(name) ?? 0;
                  const visible = districtShow;
                  const easing = visible ? EASE_OUT : EASE_IN;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(evt) => handleMouseEnter(geo, evt as unknown as React.MouseEvent)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        default: {
                          fill,
                          stroke: '#ffffff',
                          strokeWidth: 0.5,
                          outline: 'none',
                          opacity: visible ? 1 : 0,
                          transition: `opacity ${ITEM_FADE}ms ${easing} ${delay}ms`,
                        },
                        hover: {
                          fill,
                          stroke: '#ffffff',
                          strokeWidth: 0.5,
                          outline: 'none',
                          opacity: visible ? 0.8 : 0,
                          transition: `opacity ${ITEM_FADE}ms ${easing} ${delay}ms`,
                        },
                        pressed: {
                          fill,
                          stroke: '#ffffff',
                          strokeWidth: 0.5,
                          outline: 'none',
                          opacity: visible ? 0.65 : 0,
                          transition: `opacity ${ITEM_FADE}ms ${easing} ${delay}ms`,
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>
      )}

      <AnimatePresence>
        {tooltip && (
          <CityTooltip
            cityName={tooltip.cityName}
            leadingParty={tooltip.leadingParty}
            partyColor={tooltip.partyColor}
            voteCount={tooltip.voteCount}
            partyDistribution={tooltip.partyDistribution}
            position={{ x: tooltip.x, y: tooltip.y }}
            isActiveRound={isActiveRound}
            isLoggedIn={isLoggedIn}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(TurkeyMap);
