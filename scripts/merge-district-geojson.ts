/**
 * Tüm ilçe GeoJSON dosyalarını birleştirir → /public/geo/all-districts.json
 * Kullanım: npx tsx scripts/merge-district-geojson.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const DISTRICTS_DIR = path.join(__dirname, '..', 'public', 'geo', 'districts');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'geo', 'all-districts.json');

// Koordinat hassasiyetini düşür (4 ondalık ≈ 11m)
function truncateCoords(coords: unknown): unknown {
  if (typeof coords === 'number') return Math.round(coords * 10000) / 10000;
  if (Array.isArray(coords)) return coords.map(truncateCoords);
  return coords;
}

function main() {
  const files = fs.readdirSync(DISTRICTS_DIR).filter(f => f.endsWith('.json'));
  console.log(`${files.length} ilçe dosyası bulundu`);

  const allFeatures: unknown[] = [];

  for (const file of files) {
    const filePath = path.join(DISTRICTS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      console.warn(`Atlandı: ${file} — geçersiz format`);
      continue;
    }

    for (const feature of data.features) {
      // Sadece gerekli property'leri tut
      const props = feature.properties || {};
      const trimmedFeature = {
        type: 'Feature',
        properties: {
          ibbs4_name: props.ibbs4_name || '',
          ibbs3_name: props.ibbs3_name || '',
        },
        geometry: {
          type: feature.geometry.type,
          coordinates: truncateCoords(feature.geometry.coordinates),
        },
      };
      allFeatures.push(trimmedFeature);
    }
  }

  const merged = {
    type: 'FeatureCollection',
    features: allFeatures,
  };

  const json = JSON.stringify(merged);
  fs.writeFileSync(OUTPUT_FILE, json);

  const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);
  console.log(`${allFeatures.length} ilçe → ${OUTPUT_FILE} (${sizeMB} MB)`);
}

main();
