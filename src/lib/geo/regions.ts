export const REGIONS = {
  marmara: {
    label: 'Marmara',
    cities: ['İstanbul', 'Bursa', 'Balıkesir', 'Tekirdağ', 'Kocaeli', 'Sakarya', 'Çanakkale', 'Edirne', 'Kırklareli', 'Yalova', 'Bilecik'],
  },
  ic_anadolu: {
    label: 'İç Anadolu',
    cities: ['Ankara', 'Konya', 'Kayseri', 'Eskişehir', 'Sivas', 'Yozgat', 'Aksaray', 'Niğde', 'Nevşehir', 'Kırıkkale', 'Kırşehir', 'Karaman', 'Çankırı'],
  },
  ege: {
    label: 'Ege',
    cities: ['İzmir', 'Aydın', 'Denizli', 'Manisa', 'Muğla', 'Afyonkarahisar', 'Afyon', 'Kütahya', 'Uşak'],
  },
  akdeniz: {
    label: 'Akdeniz',
    cities: ['Antalya', 'Adana', 'Mersin', 'Hatay', 'Kahramanmaraş', 'Osmaniye', 'Isparta', 'Burdur'],
  },
  karadeniz: {
    label: 'Karadeniz',
    cities: ['Trabzon', 'Samsun', 'Ordu', 'Giresun', 'Rize', 'Artvin', 'Zonguldak', 'Bolu', 'Düzce', 'Kastamonu', 'Sinop', 'Çorum', 'Amasya', 'Tokat', 'Bartın', 'Karabük', 'Gümüşhane', 'Bayburt'],
  },
  guneydogu: {
    label: 'Güneydoğu Anadolu',
    cities: ['Gaziantep', 'Diyarbakır', 'Şanlıurfa', 'Mardin', 'Batman', 'Şırnak', 'Siirt', 'Adıyaman', 'Kilis'],
  },
  dogu: {
    label: 'Doğu Anadolu',
    cities: ['Van', 'Erzurum', 'Malatya', 'Elazığ', 'Ağrı', 'Muş', 'Bitlis', 'Bingöl', 'Hakkâri', 'Tunceli', 'Iğdır', 'Kars', 'Erzincan', 'Ardahan'],
  },
} as const;

export type RegionKey = keyof typeof REGIONS;

export const REGION_LABELS: Record<RegionKey, string> = {
  marmara: 'Marmara',
  ic_anadolu: 'İç Anadolu',
  ege: 'Ege',
  akdeniz: 'Akdeniz',
  karadeniz: 'Karadeniz',
  guneydogu: 'Güneydoğu Anadolu',
  dogu: 'Doğu Anadolu',
};

// Normalizer: Türkçe karakter uyumlu karşılaştırma
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a');
}

// İl → bölge lookup tablosu (lazy init)
let _cityRegionMap: Map<string, RegionKey> | null = null;

function getCityRegionMap(): Map<string, RegionKey> {
  if (_cityRegionMap) return _cityRegionMap;
  _cityRegionMap = new Map();
  for (const [regionKey, region] of Object.entries(REGIONS)) {
    for (const city of region.cities) {
      _cityRegionMap.set(normalize(city), regionKey as RegionKey);
    }
  }
  return _cityRegionMap;
}

export function getCityRegion(city: string): RegionKey | null {
  return getCityRegionMap().get(normalize(city)) ?? null;
}

export function getAllCitiesInRegion(region: RegionKey): string[] {
  return [...REGIONS[region].cities];
}

/** Bölge bazında şehir verilerini agregat et — harita renklendirmesi için */
export function aggregateCityDataByRegion(
  cityData: Array<{ cityName: string; partyDistribution?: Array<{ party: string; color: string; count: number; percentage?: number }> }>
): Map<RegionKey, { leadingParty: string; partyColor: string; totalVotes: number; partyDistribution: Array<{ party: string; color: string; count: number; percentage: number }> }> {
  const regionAgg = new Map<RegionKey, { partyTotals: Record<string, { count: number; color: string }>; totalVotes: number }>();

  for (const city of cityData) {
    const region = getCityRegion(city.cityName);
    if (!region || !city.partyDistribution) continue;

    if (!regionAgg.has(region)) {
      regionAgg.set(region, { partyTotals: {}, totalVotes: 0 });
    }
    const agg = regionAgg.get(region)!;

    for (const p of city.partyDistribution) {
      if (!agg.partyTotals[p.party]) {
        agg.partyTotals[p.party] = { count: 0, color: p.color };
      }
      agg.partyTotals[p.party].count += p.count;
      agg.totalVotes += p.count;
    }
  }

  const result = new Map<RegionKey, { leadingParty: string; partyColor: string; totalVotes: number; partyDistribution: Array<{ party: string; color: string; count: number; percentage: number }> }>();

  for (const [region, agg] of regionAgg) {
    const entries = Object.entries(agg.partyTotals).sort((a, b) => b[1].count - a[1].count);
    const leadingParty = entries[0]?.[0] || '';
    const partyColor = entries[0]?.[1]?.color || '#d4d4d4';

    const partyDistribution = entries.map(([party, data]) => ({
      party,
      color: data.color,
      count: data.count,
      percentage: agg.totalVotes > 0 ? Math.round((data.count / agg.totalVotes) * 10000) / 100 : 0,
    }));

    result.set(region, { leadingParty, partyColor, totalVotes: agg.totalVotes, partyDistribution });
  }

  return result;
}
