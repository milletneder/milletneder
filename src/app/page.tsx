'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import Counter from '@/components/ui/Counter';
import MapToolbar from '@/components/map/MapToolbar';
import type { ViewMode, DataMode } from '@/types/map';
import PartyBars from '@/components/results/PartyBars';
import CityTable from '@/components/results/CityTable';
import TransparencyReport from '@/components/results/TransparencyReport';
import ParticipationLeaderboard from '@/components/results/ParticipationLeaderboard';
import DemographicComparison from '@/components/results/DemographicComparison';
import ConfidenceIndicator from '@/components/results/ConfidenceIndicator';
import PartyDetailModal from '@/components/results/PartyDetailModal';
import VoteModal from '@/components/vote/VoteModal';
import KreosusWidget from '@/components/ui/KreosusWidget';
import type { DistrictData } from '@/components/map/TurkeyMap';
import { useAuth } from '@/lib/auth/AuthContext';
import { PARTIES, getPartyColor, getPartyName, type PartyInfo } from '@/lib/parties';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

const TurkeyMap = dynamic(() => import('@/components/map/TurkeyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface RoundInfo {
  id: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  resultsPublished: boolean;
}

export default function Home() {
  const [totalVotes, setTotalVotes] = useState(0);
  const [cityData, setCityData] = useState<Array<{
    cityId: string;
    cityName: string;
    leadingParty?: string;
    partyColor?: string;
    voteCount: number;
    partyDistribution?: Array<{ party: string; color: string; count: number }>;
  }>>([]);
  const [partyResults, setPartyResults] = useState<Array<{
    partyId: string;
    partyName: string;
    color: string;
    voteCount: number;
    percentage: number;
  }>>([]);
  const [transparencyData, setTransparencyData] = useState<{
    totalVotes: number;
    flaggedAccounts: number;
    invalidVotes: number;
    cleanVotePercentage: number;
    invalidByParty: { party: string; count: number; color: string }[];
    weighting?: {
      activeMethods: string[];
      effectiveSampleSize: number;
      sampleSize: number;
      confidence?: { overall: number; marginOfError: number };
    };
  }>({
    totalVotes: 0,
    flaggedAccounts: 0,
    invalidVotes: 0,
    cleanVotePercentage: 100,
    invalidByParty: [],
  });
  const [leaderboardData, setLeaderboardData] = useState<Array<{
    city: string;
    label?: string;
    district?: string;
    voteCount: number;
    voterCount: number;
    representationPct: number;
  }>>([]);
  const [roundInfo, setRoundInfo] = useState<RoundInfo | null>(null);
  const { isLoggedIn, token } = useAuth();
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [dbParties, setDbParties] = useState<PartyInfo[]>(PARTIES);
  const [userProfile, setUserProfile] = useState<{
    ageBracket: string | null;
    incomeBracket: string | null;
    gender: string | null;
    education: string | null;
    currentParty: string | null;
  } | null>(null);

  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const [weightedResults, setWeightedResults] = useState<{
    parties: Array<{ party: string; rawPct: number; weightedPct: number; delta: number }>;
    confidence: { overall: number; sampleSize: number; demographicBalance: number; geographicCoverage: number; fraudRate: number; marginOfError: number };
    sampleSize: number;
    effectiveSampleSize: number;
    methodology: string[];
  } | null>(null);
  const [showWeighted, setShowWeighted] = useState(true);
  const [selectedPartyDetail, setSelectedPartyDetail] = useState<{
    partyId: string; partyName: string; color: string; voteCount: number;
    percentage: number; delta?: number; rawPct?: number;
  } | null>(null);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [userIsKarasiz, setUserIsKarasiz] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const selectedCityRef = useRef<string | null>(null);
  const [districtData, setDistrictData] = useState<DistrictData[]>([]);
  const handleDistrictsLoaded = useCallback((d: DistrictData[]) => setDistrictData(d), []);

  // Toolbar state
  const [viewMode, setViewMode] = useState<ViewMode>('il');
  const [dataMode, setDataMode] = useState<DataMode>('weighted');
  const [distributeUndecided, setDistributeUndecided] = useState(false);
  const [allDistrictsData, setAllDistrictsData] = useState<DistrictData[]>([]);

  // dataMode değişince showWeighted'ı senkronize et
  const handleDataModeChange = useCallback((mode: DataMode) => {
    setDataMode(mode);
    setShowWeighted(mode === 'weighted');
  }, []);

  // showWeighted değişince dataMode'u senkronize et
  const handleShowWeightedChange = useCallback((weighted: boolean) => {
    setShowWeighted(weighted);
    setDataMode(weighted ? 'weighted' : 'raw');
  }, []);

  const fetchData = useCallback(async (showColors = false, rawMode = false, inclKarasiz = false) => {
    try {
      let citiesUrl = showColors ? '/api/map/cities?showPartyColors=true' : '/api/map/cities';
      if (rawMode) citiesUrl += (citiesUrl.includes('?') ? '&' : '?') + 'raw=true';
      if (inclKarasiz) citiesUrl += (citiesUrl.includes('?') ? '&' : '?') + 'includeKarasiz=true';
      const [liveRes, citiesRes, transparencyRes, leaderboardRes, partiesRes] = await Promise.all([
        fetch('/api/results/live-count').catch(() => null),
        fetch(citiesUrl).catch(() => null),
        fetch('/api/transparency' + (selectedCityRef.current ? `?city=${encodeURIComponent(selectedCityRef.current)}` : '')).catch(() => null),
        fetch('/api/leaderboard').catch(() => null),
        fetch('/api/parties').catch(() => null),
      ]);

      // Partileri önce parse et — diğer yerlerde renk/isim lookup için kullanılacak
      const partyColorMap = new Map<string, string>();
      const partyNameMap = new Map<string, string>();
      const partyShortNameMap = new Map<string, string>();
      if (partiesRes?.ok) {
        const data = await partiesRes.json();
        if (data.parties?.length > 0) {
          const mapped: PartyInfo[] = data.parties.map((p: { slug: string; name: string; short_name: string; color: string; text_color: string; logo_url?: string }) => ({
            id: p.slug,
            name: p.name,
            shortName: p.short_name,
            color: p.color,
            textColor: p.text_color,
            logoUrl: p.logo_url,
          }));
          setDbParties(mapped);
          mapped.forEach(p => {
            partyColorMap.set(p.id, p.color);
            partyNameMap.set(p.id, p.name);
            partyShortNameMap.set(p.id, p.shortName);
          });
        }
      }
      const lookupColor = (id: string) => partyColorMap.get(id) || getPartyColor(id);
      const lookupName = (id: string) => partyNameMap.get(id) || getPartyName(id);
      const lookupShortName = (id: string) => partyShortNameMap.get(id) || PARTIES.find(p => p.id === id)?.shortName || lookupName(id);

      if (liveRes?.ok) {
        const liveData = await liveRes.json();
        setTotalVotes(liveData.totalVotes || 0);
        setRoundInfo(liveData.round || null);
        // partyResults'taki partyName'i shortName ile değiştir
        const results = (liveData.partyResults || []).map((r: { partyId: string; partyName: string; color: string; voteCount: number; percentage: number }) => ({
          ...r,
          partyName: lookupShortName(r.partyId),
          color: lookupColor(r.partyId),
        }));
        setPartyResults(results);
        if (liveData.round?.endDate) {
          const end = new Date(liveData.round.endDate);
          const now = new Date();
          const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setDaysRemaining(Math.max(0, diff));
        }
      }

      if (citiesRes?.ok) {
        const data = await citiesRes.json();
        const cities = (data.cities || []).map((c: { city: string; totalVotes: number; leadingParty?: string; partyColor?: string; partyDistribution?: Array<{ party: string; color: string; count: number }> }) => ({
          cityId: c.city,
          cityName: c.city,
          leadingParty: c.leadingParty,
          partyColor: c.partyColor || (c.leadingParty ? lookupColor(c.leadingParty) : undefined),
          voteCount: c.totalVotes || 0,
          partyDistribution: c.partyDistribution,
        }));
        setCityData(cities);
      }

      if (transparencyRes?.ok) {
        const t = await transparencyRes.json();
        setTransparencyData({
          totalVotes: t.totalVotes || 0,
          flaggedAccounts: t.flaggedAccounts || 0,
          invalidVotes: t.invalidVotes || 0,
          cleanVotePercentage: t.cleanVotePercentage ?? 100,
          invalidByParty: Object.entries(t.invalidPartyDistribution || {}).map(
            ([party, count]) => ({
              party: lookupName(party),
              count: count as number,
              color: lookupColor(party),
            })
          ),
          weighting: t.weighting ? {
            activeMethods: t.weighting.activeMethods || [],
            effectiveSampleSize: t.weighting.effectiveSampleSize || 0,
            sampleSize: t.weighting.sampleSize || 0,
            confidence: t.weighting.confidence,
          } : undefined,
        });
      }

      if (leaderboardRes?.ok) {
        const data = await leaderboardRes.json();
        const entries = (data.leaderboard || []).map((e: { city: string; label?: string; district?: string; voteCount: number; voterCount: number; representationPct: number }) => ({
          city: e.city,
          label: e.label,
          district: e.district,
          voteCount: e.voteCount ?? 0,
          voterCount: e.voterCount ?? 0,
          representationPct: e.representationPct ?? 0,
        }));
        setLeaderboardData(entries);
      }

      // Ağırlıklı sonuçları çek
      try {
        const weightedRes = await fetch('/api/results/weighted?scope=national');
        if (weightedRes?.ok) {
          const w = await weightedRes.json();
          if (w.parties && w.confidence) {
            setWeightedResults({
              parties: w.parties.map((p: { party: string; rawPct: number; weightedPct: number; delta: number }) => ({
                party: p.party,
                rawPct: p.rawPct,
                weightedPct: p.weightedPct,
                delta: p.delta,
              })),
              confidence: w.confidence,
              sampleSize: w.sampleSize,
              effectiveSampleSize: w.effectiveSampleSize,
              methodology: Array.isArray(w.methodology) ? w.methodology : (w.methodology?.activeMethods || []),
            });
          }
        }
      } catch {
        // Ağırlıklı sonuçlar opsiyonel
      }

      // Harita SVG'sini JPEG olarak yakala ve OG image olarak kaydet (günde 1 kez, sadece renkli harita)
      setTimeout(() => {
        try {
          if (!showColors) return; // Gri haritayı yakalama, sadece renkli olanı kaydet

          const lastCapture = localStorage.getItem('og-capture-v2');
          const today = new Date().toDateString();
          if (lastCapture === today) return;

          const svgEl = document.querySelector('svg.rsm-svg') as SVGSVGElement | null;
          if (!svgEl) { console.log('[OG] SVG not found'); return; }

          // SVG'yi klonla ve computed fill renklerini inline yap
          const clone = svgEl.cloneNode(true) as SVGSVGElement;
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          const bbox = svgEl.getBoundingClientRect();
          clone.setAttribute('width', String(bbox.width));
          clone.setAttribute('height', String(bbox.height));

          // Orijinal SVG'deki her path'in computed fill rengini klona aktar
          const origPaths = svgEl.querySelectorAll('path');
          const clonePaths = clone.querySelectorAll('path');
          origPaths.forEach((origPath, i) => {
            if (clonePaths[i]) {
              const computed = window.getComputedStyle(origPath);
              clonePaths[i].setAttribute('fill', computed.fill || origPath.getAttribute('fill') || '#e5e5e5');
              clonePaths[i].setAttribute('stroke', computed.stroke || origPath.getAttribute('stroke') || '#ffffff');
              clonePaths[i].setAttribute('stroke-width', computed.strokeWidth || origPath.getAttribute('stroke-width') || '0.5');
            }
          });

          const svgData = new XMLSerializer().serializeToString(clone);
          const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);

          const canvas = document.createElement('canvas');
          canvas.width = 1200;
          canvas.height = 630;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 1200, 630);

          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const scale = Math.min(1200 / img.naturalWidth, 630 / img.naturalHeight) * 0.9;
            const x = (1200 - img.naturalWidth * scale) / 2;
            const y = (630 - img.naturalHeight * scale) / 2;
            ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
            URL.revokeObjectURL(url);

            try {
              const jpegData = canvas.toDataURL('image/jpeg', 0.9);
              fetch('/api/og/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: jpegData, secret: 'og-map-capture' }),
              }).then(r => {
                if (r.ok) {
                  localStorage.setItem('og-capture-v2', today);
                  console.log('[OG] Map captured successfully');
                } else {
                  console.log('[OG] Upload failed:', r.status);
                }
              }).catch(e => console.log('[OG] Upload error:', e));
            } catch (e) {
              console.log('[OG] Canvas export error:', e);
            }
          };
          img.onerror = (e) => {
            console.log('[OG] Image load error:', e);
            URL.revokeObjectURL(url);
          };
          img.src = url;
        } catch (e) {
          console.log('[OG] Capture error:', e);
        }
      }, 5000);

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch all-districts data when ilçe view is selected
  useEffect(() => {
    if (viewMode !== 'ilce') return;
    const isRaw = dataMode === 'raw';
    let url = '/api/map/all-districts';
    if (isRaw) url += '?raw=true';
    if (distributeUndecided) url += (url.includes('?') ? '&' : '?') + 'includeKarasiz=true';
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.districts) setAllDistrictsData(data.districts);
      })
      .catch(() => {});
  }, [viewMode, dataMode, distributeUndecided]);

  // Header yüksekliği artık Header bileşenindeki spacer div tarafından yönetiliyor

  // 'open-vote-modal' event'ini dinle (Header'daki Katıl butonu için)
  useEffect(() => {
    const handler = () => setIsVoteModalOpen(true);
    window.addEventListener('open-vote-modal', handler);
    return () => window.removeEventListener('open-vote-modal', handler);
  }, []);

  // URL'den ?vote=true parametresini kontrol et (diğer sayfalardan yönlendirme)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vote') === 'true') {
      setIsVoteModalOpen(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // selectedCity ref'ini senkronize et ve şeffaflık verisini güncelle
  useEffect(() => {
    selectedCityRef.current = selectedCity;
    // Şeffaflık raporunu il seçimine göre güncelle
    const url = '/api/transparency' + (selectedCity ? `?city=${encodeURIComponent(selectedCity)}` : '');
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(t => {
        if (t) {
          setTransparencyData({
            totalVotes: t.totalVotes || 0,
            flaggedAccounts: t.flaggedAccounts || 0,
            invalidVotes: t.invalidVotes || 0,
            cleanVotePercentage: t.cleanVotePercentage ?? 100,
            invalidByParty: Object.entries(t.invalidPartyDistribution || {}).map(
              ([party, count]) => ({
                party,
                count: count as number,
                color: '#555555',
              })
            ),
            weighting: t.weighting ? {
              activeMethods: t.weighting.activeMethods || [],
              effectiveSampleSize: t.weighting.effectiveSampleSize || 0,
              sampleSize: t.weighting.sampleSize || 0,
              confidence: t.weighting.confidence,
            } : undefined,
          });
        }
      })
      .catch(() => {});
  }, [selectedCity]);

  // Leaderboard: ilçe moduna veya il seçimine göre güncelle
  useEffect(() => {
    let url = '/api/leaderboard';
    if (selectedCity) {
      url += `?city=${encodeURIComponent(selectedCity)}`;
    } else if (viewMode === 'ilce') {
      url += '?scope=district';
    }
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.leaderboard) {
          setLeaderboardData(data.leaderboard.map((e: { city: string; label?: string; district?: string; voteCount: number; voterCount: number; representationPct: number }) => ({
            city: e.city,
            label: e.label,
            district: e.district,
            voteCount: e.voteCount ?? 0,
            voterCount: e.voterCount ?? 0,
            representationPct: e.representationPct ?? 0,
          })));
        }
      })
      .catch(() => {});
  }, [viewMode, selectedCity]);

  useEffect(() => {
    const isRaw = dataMode === 'raw';
    fetchData(userHasVoted, isRaw, distributeUndecided);
    const interval = setInterval(() => fetchData(userHasVoted, isRaw, distributeUndecided), 30000);
    return () => clearInterval(interval);
  }, [fetchData, userHasVoted, dataMode, distributeUndecided]);

  // Fetch user profile for demographic comparison
  useEffect(() => {
    if (!isLoggedIn || !token) {
      setUserProfile(null);
      setUserHasVoted(false);
      return;
    }

    fetch('/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUserProfile({
            ageBracket: data.user.age_bracket ?? null,
            incomeBracket: data.user.income_bracket ?? null,
            gender: data.user.gender ?? null,
            education: data.user.education ?? null,
            currentParty: null,
          });
          // Demografik banner artık Header içindeki DemographicBanner component'i tarafından yönetilir
          // Herhangi bir turda oy kullanmış mı kontrol et
          fetch('/api/user/vote-history', {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((voteData) => {
              if (voteData?.history?.length > 0) {
                // Aktif turdaki oyu varsa onu al, yoksa en son oyu
                const activeVote = data.activeRoundId
                  ? voteData.history.find((v: { roundId: number }) => v.roundId === data.activeRoundId)
                  : null;
                const latestVote = activeVote || voteData.history[0];
                const isKarasiz = latestVote?.partySlug === 'karasizim';

                // Kararsız oy kullananlara sonuçları gösterme
                setUserIsKarasiz(isKarasiz);
                setUserHasVoted(!isKarasiz);

                if (latestVote) {
                  setUserProfile((prev) =>
                    prev ? { ...prev, currentParty: latestVote.party ?? null } : prev
                  );
                }
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [isLoggedIn, token, profileRefreshKey]);

  const currentMonth = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  // Oy kullanmış kullanıcılar parti renklerini görür, diğerleri katılım haritasını
  const isActiveRound = !userHasVoted;

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Header />

      {/* MAP — viewport yüksekliği header hariç */}
      <section className="w-full overflow-hidden md:h-[calc(100dvh-var(--header-height,48px))]">
        <TurkeyMap
          cityData={cityData}
          isActiveRound={!!isActiveRound}
          selectedCity={selectedCity}
          onCityClick={(_id: string, name: string) => setSelectedCity(name)}
          onBack={() => { setSelectedCity(null); setDistrictData([]); }}
          onDistrictsLoaded={handleDistrictsLoaded}
          showPartyColors={userHasVoted}
          isLoggedIn={isLoggedIn}
          viewMode={viewMode}
          allDistrictsData={allDistrictsData}
        />

        {/* Map Toolbar */}
        <MapToolbar
          viewMode={viewMode}
          dataMode={dataMode}
          distributeUndecided={distributeUndecided}
          onViewModeChange={setViewMode}
          onDataModeChange={handleDataModeChange}
          onDistributeUndecidedChange={setDistributeUndecided}
          isVisible={selectedCity === null}
          showDataToggles={userHasVoted}
          isLoggedIn={isLoggedIn}
          onVoteClick={() => setIsVoteModalOpen(true)}
        />
      </section>

      {/* Tur bilgileri — harita altı */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span>
          {currentMonth} turunun tamamlanmasına <span className="text-foreground font-medium">{daysRemaining} gün</span> kaldı.
        </span>
        <span>
          Toplam geçerli oy: <Counter value={totalVotes} className="text-foreground text-xs font-medium" />
        </span>
      </div>

      {/* BELOW THE FOLD — content sections */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-24 py-24">
        {/* District breakdown when a city is selected — sadece login kullanıcılar */}
        {isLoggedIn && selectedCity && districtData.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">{selectedCity} — İlçe Kırılımı</h2>
              <span className="text-xs text-muted-foreground">
                {districtData.reduce((s, d) => s + d.totalVotes, 0).toLocaleString('tr-TR')} oy — {districtData.length} ilçe
              </span>
            </div>
            <div className="space-y-2">
              {districtData.map((d) => {
                const maxD = Math.max(...districtData.map(x => x.totalVotes), 1);
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium">{d.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{d.totalVotes.toLocaleString('tr-TR')} oy</span>
                    </div>
                    {userHasVoted && d.parties.length > 0 ? (
                      <div className="flex gap-0.5 h-3">
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
                    ) : (
                      <div className="h-3 bg-muted rounded-sm">
                        <div
                          className="h-full bg-foreground/80 rounded-sm"
                          style={{ width: `${(d.totalVotes / maxD) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Kararsız kullanıcılar için mesaj */}
        {userIsKarasiz && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm font-medium mb-1">
                  Sonuçları görmek için bir parti seçmelisin
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Kararsız olarak oy kullandın. Parti tercihini belirleyince canlı sonuçları ve detaylı kırılımları görebilirsin.
                </p>
                <Button onClick={() => setIsVoteModalOpen(true)}>
                  Parti Seçimimi Güncelle
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          {/* Ham / Ağırlıklı toggle — sadece login kullanıcılar */}
          {isLoggedIn && !selectedCity && weightedResults && weightedResults.methodology.length > 0 && (
            <div data-slot="button-group" className="flex items-center mb-6 w-fit">
              <Button
                               variant={!showWeighted ? 'default' : 'ghost'}
                onClick={() => handleShowWeightedChange(false)}
              >
                Ham Sonuçlar
              </Button>
              <Button
                               variant={showWeighted ? 'default' : 'ghost'}
                onClick={() => handleShowWeightedChange(true)}
              >
                Ağırlıklı Sonuçlar
              </Button>
            </div>
          )}

          {/* İl seçiliyken o ilin sonuçlarını göster */}
          {selectedCity && districtData.length > 0 ? (
            <PartyBars
              results={(() => {
                // District data'dan il geneli parti sonuçlarını hesapla
                const partyTotals: Record<string, { count: number; color: string }> = {};
                let grandTotal = 0;
                for (const d of districtData) {
                  for (const p of d.parties) {
                    if (!partyTotals[p.party]) partyTotals[p.party] = { count: 0, color: p.color };
                    partyTotals[p.party].count += p.count;
                    grandTotal += p.count;
                  }
                }
                return Object.entries(partyTotals)
                  .map(([party, data]) => ({
                    partyId: party,
                    partyName: party,
                    color: data.color,
                    voteCount: data.count,
                    percentage: grandTotal > 0 ? (data.count / grandTotal) * 100 : 0,
                  }))
                  .sort((a, b) => b.voteCount - a.voteCount);
              })()}
              isActiveRound={!!isActiveRound}
              title={`${selectedCity} Geneli Sonuçlar`}
              onPartyClick={isLoggedIn ? (p) => setSelectedPartyDetail(p) : undefined}
            />
          ) : showWeighted && weightedResults ? (
            <PartyBars
              results={partyResults.map(r => {
                const w = weightedResults.parties.find(p => p.party === r.partyId);
                return w ? { ...r, percentage: w.weightedPct, delta: w.delta } : r;
              })}
              isActiveRound={!!isActiveRound}
              onPartyClick={isLoggedIn ? (p) => {
                const w = weightedResults.parties.find(wp => wp.party === p.partyId);
                setSelectedPartyDetail({
                  ...p,
                  rawPct: w?.rawPct,
                });
              } : undefined}
            />
          ) : (
            <PartyBars results={partyResults} isActiveRound={!!isActiveRound} onPartyClick={isLoggedIn ? (p) => setSelectedPartyDetail(p) : undefined} />
          )}
        </motion.section>

        {/* Güven Skoru — sadece ulusal görünümde ve login kullanıcılar */}
        {isLoggedIn && !selectedCity && weightedResults && weightedResults.methodology.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <ConfidenceIndicator
              overall={weightedResults.confidence.overall}
              sampleSize={weightedResults.confidence.sampleSize}
              demographicBalance={weightedResults.confidence.demographicBalance}
              geographicCoverage={weightedResults.confidence.geographicCoverage}
              fraudRate={weightedResults.confidence.fraudRate}
              marginOfError={weightedResults.confidence.marginOfError}
              effectiveSampleSize={weightedResults.effectiveSampleSize}
              totalSampleSize={weightedResults.sampleSize}
            />
          </motion.section>
        )}

        {/* İl/İlçe Sıralama — sadece login kullanıcılar */}
        {isLoggedIn && <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          {/* İl seçili → ilçe sıralaması, ilçe modu → ulusal ilçe sıralaması, default → il sıralaması */}
          {selectedCity && districtData.length > 0 ? (
            <CityTable
              cities={districtData.map(d => ({
                cityId: d.name,
                cityName: d.name,
                voteCount: d.totalVotes,
                leadingParty: d.leadingParty,
                partyColor: d.leadingColor,
              }))}
              isActiveRound={!!isActiveRound}
              title={`${selectedCity} — İlçe Bazlı Sıralama`}
              columnLabel="İlçe"
            />
          ) : viewMode === 'ilce' && allDistrictsData.length > 0 ? (
            <CityTable
              cities={allDistrictsData.map(d => ({
                cityId: d.name,
                cityName: `${d.name}${d.city ? ` (${d.city})` : ''}`,
                voteCount: d.totalVotes,
                leadingParty: d.leadingParty,
                partyColor: d.leadingColor,
              }))}
              isActiveRound={!!isActiveRound}
              title="İlçe Bazlı Sıralama"
              columnLabel="İlçe"
            />
          ) : (
            <CityTable
              cities={cityData}
              isActiveRound={!!isActiveRound}
              onCityClick={(city) => setSelectedCity(city)}
            />
          )}
        </motion.section>}

        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <TransparencyReport data={transparencyData} selectedCity={selectedCity} />
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <ParticipationLeaderboard
            entries={leaderboardData}
            title={
              selectedCity
                ? `${selectedCity} — İlçe Temsil Oranı`
                : viewMode === 'ilce'
                ? 'İlçe Bazlı Temsil Oranı Sıralaması'
                : undefined
            }
            subtitle={
              selectedCity
                ? `${selectedCity} ilçelerinin seçmen sayısına oranla katılımı`
                : viewMode === 'ilce'
                ? 'İlçe seçmen sayısına oranla katılım — YSK kayıtlı seçmen verilerine göre'
                : undefined
            }
          />
        </motion.section>

        {/* Demografik Karşılaştırmalar — sadece login kullanıcılar */}
        {isLoggedIn && (
          <>
            <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <DemographicComparison
                type="age"
                userBracket={userProfile?.ageBracket ?? null}
                hasVoted={userHasVoted}
                isLoggedIn={isLoggedIn}
                userParty={userProfile?.currentParty}
              />
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <DemographicComparison
                type="income"
                userBracket={userProfile?.incomeBracket ?? null}
                hasVoted={userHasVoted}
                isLoggedIn={isLoggedIn}
                userParty={userProfile?.currentParty}
              />
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <DemographicComparison
                type="gender"
                userBracket={userProfile?.gender ?? null}
                hasVoted={userHasVoted}
                isLoggedIn={isLoggedIn}
                userParty={userProfile?.currentParty}
              />
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <DemographicComparison
                type="education"
                userBracket={userProfile?.education ?? null}
                hasVoted={userHasVoted}
                isLoggedIn={isLoggedIn}
                userParty={userProfile?.currentParty}
              />
            </motion.section>
          </>
        )}

        {/* Kreosus Bağış Modülü */}
        <motion.section
          id="bagis-yap"
          className="scroll-mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card>
            <CardContent className="pt-6">
            <h2 className="text-lg font-bold mb-1">Bağımsızlığımıza Destek Ol</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Hiçbir siyasi veya ticari kuruluştan fon almıyoruz. Platformun sürdürülebilirliği topluluk desteğiyle mümkün.
            </p>
            <KreosusWidget />
            </CardContent>
          </Card>
        </motion.section>

        <footer className="py-12">
          <Separator className="mb-12" />
          <div className="text-center space-y-4">
            <p className="text-xs font-bold tracking-wide">#MilletNeDer</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Herhangi bir siyasi parti, kurum veya kuruluşla bağlantımız yoktur. Tamamen bağımsız ve şeffaf bir platformuz.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <a href="/gizlilik" className="text-muted-foreground hover:text-foreground transition-colors">Gizlilik Politikası</a>
              <Separator orientation="vertical" className="h-3" />
              <a href="/kullanim-kosullari" className="text-muted-foreground hover:text-foreground transition-colors">Kullanım Koşulları</a>
              <Separator orientation="vertical" className="h-3" />
              <a href="/metodoloji" className="text-muted-foreground hover:text-foreground transition-colors">Metodoloji</a>
            </div>
            <p className="text-xs text-muted-foreground/60">
              &copy; 2026 MilletNeDer. Bağımsız seçim nabzı platformu. Tüm veriler anonimdir.
            </p>
          </div>
        </footer>
      </div>

      <VoteModal
        isOpen={isVoteModalOpen}
        onClose={() => {
          setIsVoteModalOpen(false);
          // Modal kapandığında profil ve verileri yenile (yeni giriş/oy/demografik bilgi sonrası)
          setProfileRefreshKey(k => k + 1);
          const isRaw = dataMode === 'raw';
          fetchData(userHasVoted, isRaw, distributeUndecided);
        }}
        parties={dbParties}
        isLoggedIn={isLoggedIn}
        activeRoundId={roundInfo?.id}
      />

      <PartyDetailModal
        party={selectedPartyDetail}
        totalVotes={totalVotes}
        onClose={() => setSelectedPartyDetail(null)}
      />
    </main>
  );
}
