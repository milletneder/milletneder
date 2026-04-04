/**
 * Bölge ve Türkiye outline GeoJSON dosyalarını oluşturur.
 *
 * Il GeoJSON'ından:
 * 1. /public/geo/regions.json — 7 bölge (illeri birleştirir)
 * 2. /public/geo/turkey-outline.json — tek Türkiye sınırı
 *
 * Kullanım: npx ts-node scripts/generate-region-geojson.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// @ts-ignore
import turfUnion from '@turf/union';
import { feature as turfFeature, featureCollection } from '@turf/helpers';

const REGIONS: Record<string, { label: string; cities: string[] }> = {
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
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i');
}

async function main() {
  // Il GeoJSON'ı oku (önceden indirilmişse)
  const citiesPath = path.join(__dirname, '..', 'node_modules', '.cache', 'tr-cities.json');
  const publicGeo = path.join(__dirname, '..', 'public', 'geo');

  // Download if not cached
  let citiesData: string;
  if (fs.existsSync(citiesPath)) {
    citiesData = fs.readFileSync(citiesPath, 'utf-8');
  } else {
    // Try from /tmp
    const tmpPath = '/tmp/tr-cities.json';
    if (fs.existsSync(tmpPath)) {
      fs.mkdirSync(path.dirname(citiesPath), { recursive: true });
      fs.copyFileSync(tmpPath, citiesPath);
      citiesData = fs.readFileSync(citiesPath, 'utf-8');
    } else {
      console.error('tr-cities.json bulunamadı. Önce indirin.');
      process.exit(1);
    }
  }

  const cities = JSON.parse(citiesData) as GeoJSON.FeatureCollection;

  // City name → feature lookup
  const cityFeatures = new Map<string, GeoJSON.Feature>();
  for (const f of cities.features) {
    const name = (f.properties as Record<string, string>)?.name ?? '';
    cityFeatures.set(normalize(name), f);
  }

  // ── 1. Bölge GeoJSON oluştur ──
  const regionFeatures: GeoJSON.Feature[] = [];

  for (const [regionKey, region] of Object.entries(REGIONS)) {
    const features: GeoJSON.Feature[] = [];
    const missingCities: string[] = [];

    for (const cityName of region.cities) {
      const f = cityFeatures.get(normalize(cityName));
      if (f) {
        features.push(f);
      } else {
        missingCities.push(cityName);
      }
    }

    if (missingCities.length > 0) {
      console.warn(`[${regionKey}] Bulunamayan iller:`, missingCities);
    }

    if (features.length === 0) {
      console.error(`[${regionKey}] Hiç il bulunamadı!`);
      continue;
    }

    // turf.union ile birleştir (v7: FeatureCollection alır)
    try {
      const fc = featureCollection(features as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[]);
      const merged = turfUnion(fc, { properties: { region: regionKey, name: region.label } });
      if (merged) {
        regionFeatures.push(merged);
      }
    } catch (e) {
      console.warn(`[${regionKey}] Union hatası:`, e);
    }
  }

  const regionsGeoJSON = featureCollection(regionFeatures);
  const regionsPath = path.join(publicGeo, 'regions.json');
  fs.writeFileSync(regionsPath, JSON.stringify(regionsGeoJSON));
  console.log(`✓ regions.json yazıldı (${regionFeatures.length} bölge, ${(fs.statSync(regionsPath).size / 1024).toFixed(0)} KB)`);

  // ── 2. Türkiye outline GeoJSON oluştur ──
  const allCitiesFC = featureCollection(cities.features as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[]);
  const turkeyOutline = turfUnion(allCitiesFC, { properties: { name: 'Türkiye' } });
  if (!turkeyOutline) {
    console.error('Türkiye outline oluşturulamadı');
    process.exit(1);
  }
  const outlineGeoJSON = featureCollection([turkeyOutline]);
  const outlinePath = path.join(publicGeo, 'turkey-outline.json');
  fs.writeFileSync(outlinePath, JSON.stringify(outlineGeoJSON));
  console.log(`✓ turkey-outline.json yazıldı (${(fs.statSync(outlinePath).size / 1024).toFixed(0)} KB)`);
}

main().catch(console.error);
