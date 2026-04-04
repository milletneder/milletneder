/**
 * District-level seed data generator
 *
 * Reads city-level election and voter data from existing SQL seed files,
 * distributes them across districts using deterministic pseudo-random weights,
 * and outputs SQL INSERT statements.
 *
 * Usage: npx tsx scripts/seed-district-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// --- Import city-districts mapping ---
// We'll parse the TS file directly since it's a simple Record<string, string[]>
const cityDistrictsPath = path.join(__dirname, '..', 'src', 'lib', 'geo', 'city-districts.ts');
const cityDistrictsSource = fs.readFileSync(cityDistrictsPath, 'utf-8');

// Extract the CITY_DISTRICTS object by evaluating the array literals
function parseCityDistricts(source: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  // Match each city line: 'CityName': ['District1', 'District2', ...]
  const cityRegex = /'([^']+)':\s*\[([^\]]+)\]/g;
  let match;
  while ((match = cityRegex.exec(source)) !== null) {
    const cityName = match[1];
    const districtsStr = match[2];
    const districts: string[] = [];
    const distRegex = /'([^']+)'/g;
    let dMatch;
    while ((dMatch = distRegex.exec(districtsStr)) !== null) {
      districts.push(dMatch[1]);
    }
    if (districts.length > 0) {
      result[cityName] = districts;
    }
  }
  return result;
}

const CITY_DISTRICTS = parseCityDistricts(cityDistrictsSource);

// --- Parse voter counts from SQL ---
interface CityVoterData {
  city: string;
  voter_count: number;
}

function parseVoterCounts(sqlPath: string): CityVoterData[] {
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  const results: CityVoterData[] = [];
  // Match: ('CityName', 123456, 'YSK 2023', 2023)
  const regex = /\('([^']+)',\s*(\d+),\s*'YSK 2023',\s*2023\)/g;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    results.push({ city: match[1], voter_count: parseInt(match[2], 10) });
  }
  return results;
}

// --- Parse election results from SQL ---
interface CityElectionData {
  city: string;
  party_slug: string;
  vote_count: number;
  vote_share: number;
}

function parseElectionResults(sqlPath: string): CityElectionData[] {
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  const results: CityElectionData[] = [];
  // Match: ('CityName', 'party-slug', 123456, 0.1234)
  const regex = /\('([^']+)',\s*'([^']+)',\s*(\d+),\s*([\d.]+)\)/g;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    results.push({
      city: match[1],
      party_slug: match[2],
      vote_count: parseInt(match[3], 10),
      vote_share: parseFloat(match[4]),
    });
  }
  return results;
}

// --- Deterministic hash function ---
function hashString(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Seeded pseudo-random number generator (mulberry32)
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Known large districts for major cities (get extra weight)
const LARGE_DISTRICTS: Record<string, string[]> = {
  'İstanbul': ['Esenyurt', 'Bağcılar', 'Küçükçekmece', 'Pendik', 'Ümraniye', 'Sultangazi', 'Gaziosmanpaşa', 'Bahçelievler', 'Sultanbeyli', 'Maltepe', 'Kartal', 'Sancaktepe', 'Esenler', 'Ataşehir', 'Üsküdar', 'Kadıköy', 'Fatih', 'Arnavutköy', 'Beylikdüzü', 'Başakşehir'],
  'Ankara': ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Etimesgut', 'Sincan', 'Altındağ', 'Pursaklar'],
  'İzmir': ['Buca', 'Karabağlar', 'Bornova', 'Konak', 'Karşıyaka', 'Bayraklı', 'Çiğli', 'Menemen', 'Torbalı', 'Gaziemir'],
  'Bursa': ['Osmangazi', 'Nilüfer', 'Yıldırım', 'İnegöl'],
  'Antalya': ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Alanya', 'Manavgat'],
  'Gaziantep': ['Şahinbey', 'Şehitkamil'],
  'Konya': ['Selçuklu', 'Meram', 'Karatay'],
  'Adana': ['Seyhan', 'Çukurova', 'Yüreğir', 'Sarıçam', 'Ceyhan'],
  'Kocaeli': ['İzmit', 'Gebze', 'Darıca'],
  'Mersin': ['Yenişehir', 'Mezitli', 'Akdeniz', 'Toroslar', 'Tarsus'],
  'Diyarbakır': ['Bağlar', 'Kayapınar', 'Yenişehir', 'Sur'],
  'Hatay': ['Antakya', 'İskenderun', 'Defne'],
  'Kayseri': ['Melikgazi', 'Kocasinan', 'Talas'],
  'Samsun': ['İlkadım', 'Atakum', 'Canik'],
  'Tekirdağ': ['Çorlu', 'Süleymanpaşa', 'Çerkezköy'],
  'Şanlıurfa': ['Eyyübiye', 'Haliliye', 'Karaköprü', 'Siverek', 'Viranşehir'],
  'Denizli': ['Merkezefendi', 'Pamukkale'],
  'Eskişehir': ['Odunpazarı', 'Tepebaşı'],
  'Malatya': ['Battalgazi', 'Yeşilyurt'],
  'Trabzon': ['Ortahisar', 'Akçaabat'],
  'Manisa': ['Yunusemre', 'Şehzadeler', 'Turgutlu', 'Akhisar'],
  'Balıkesir': ['Altıeylül', 'Karesi', 'Bandırma'],
  'Sakarya': ['Adapazarı', 'Serdivan', 'Erenler'],
  'Kahramanmaraş': ['Onikişubat', 'Dulkadiroğlu'],
  'Van': ['İpekyolu', 'Tuşba', 'Edremit', 'Erciş'],
  'Aydın': ['Efeler', 'Nazilli', 'Söke', 'Kuşadası'],
  'Muğla': ['Bodrum', 'Fethiye', 'Menteşe', 'Marmaris', 'Milas'],
};

// Generate weights for districts of a city
function generateDistrictWeights(city: string, districts: string[]): number[] {
  const seed = hashString(city + '_district_weights');
  const rng = mulberry32(seed);
  const largeDistricts = LARGE_DISTRICTS[city] || [];

  const rawWeights = districts.map((district) => {
    const isLarge = largeDistricts.includes(district);
    const base = rng() * 0.5 + 0.5; // 0.5 to 1.0
    // Large districts get 2x-4x multiplier
    const multiplier = isLarge ? 2.0 + rng() * 2.0 : base;
    return multiplier;
  });

  const sum = rawWeights.reduce((a, b) => a + b, 0);
  return rawWeights.map((w) => w / sum);
}

// Add small variation to party distribution per district
function addVariation(baseShare: number, seed: number): number {
  const rng = mulberry32(seed);
  // +/- 15% variation
  const factor = 0.85 + rng() * 0.30;
  return baseShare * factor;
}

// SQL-escape a string
function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

// --- Main ---
function main() {
  const voterCountsPath = path.join(__dirname, 'seed-voter-counts.sql');
  const electionResultsPath = path.join(__dirname, 'seed-city-election-2023.sql');

  const voterCounts = parseVoterCounts(voterCountsPath);
  const electionResults = parseElectionResults(electionResultsPath);

  // Group election results by city
  const electionByCity: Record<string, CityElectionData[]> = {};
  for (const r of electionResults) {
    if (!electionByCity[r.city]) electionByCity[r.city] = [];
    electionByCity[r.city].push(r);
  }

  // Voter count map
  const voterCountMap: Record<string, number> = {};
  for (const v of voterCounts) {
    voterCountMap[v.city] = v.voter_count;
  }

  const voterInserts: string[] = [];
  const electionInserts: string[] = [];

  let cityCount = 0;
  let districtCount = 0;

  for (const [city, districts] of Object.entries(CITY_DISTRICTS)) {
    const totalVoters = voterCountMap[city];
    if (totalVoters === undefined) {
      console.error(`WARNING: No voter count found for city: ${city}`);
      continue;
    }

    const cityElection = electionByCity[city];
    if (!cityElection) {
      console.error(`WARNING: No election data found for city: ${city}`);
      continue;
    }

    const weights = generateDistrictWeights(city, districts);

    cityCount++;

    for (let i = 0; i < districts.length; i++) {
      const district = districts[i];
      const weight = weights[i];
      const districtVoters = Math.round(totalVoters * weight);
      districtCount++;

      voterInserts.push(
        `('${sqlEscape(city)}', '${sqlEscape(district)}', ${districtVoters}, 'YSK 2023 (tahmini)', 2023)`
      );

      // Distribute each party's votes
      // First compute adjusted shares for this district, then normalize
      const partySeed = hashString(city + district);
      const adjustedShares: { party: string; adjustedShare: number; originalVotes: number }[] = [];

      for (const partyData of cityElection) {
        const adjusted = addVariation(partyData.vote_share, partySeed + hashString(partyData.party_slug));
        adjustedShares.push({
          party: partyData.party_slug,
          adjustedShare: adjusted,
          originalVotes: partyData.vote_count,
        });
      }

      // Normalize adjusted shares
      const totalAdjustedShare = adjustedShares.reduce((a, b) => a + b.adjustedShare, 0);
      const originalTotalShare = cityElection.reduce((a, b) => a + b.vote_share, 0);
      const normFactor = originalTotalShare / totalAdjustedShare;

      for (const ps of adjustedShares) {
        const normalizedShare = ps.adjustedShare * normFactor;
        // District vote count = district voters * normalized party share
        const districtVoteCount = Math.round(districtVoters * normalizedShare);
        const districtVoteShare = parseFloat(normalizedShare.toFixed(6));

        electionInserts.push(
          `('${sqlEscape(city)}', '${sqlEscape(district)}', '${sqlEscape(ps.party)}', ${districtVoteCount}, ${districtVoteShare})`
        );
      }
    }
  }

  // Build SQL output
  let sql = `-- İlçe bazlı seed verileri (tahmini dağılım)
-- Otomatik oluşturuldu: ${new Date().toISOString().split('T')[0]}
-- ${cityCount} il, ${districtCount} ilçe

-- ============================================
-- district_voter_counts
-- ============================================

INSERT INTO district_voter_counts (city, district, voter_count, source, year) VALUES
${voterInserts.join(',\n')}
ON CONFLICT ON CONSTRAINT district_voter_counts_city_district_idx
DO UPDATE SET voter_count = EXCLUDED.voter_count, source = EXCLUDED.source, year = EXCLUDED.year, updated_at = NOW();

-- ============================================
-- district_election_results_2023
-- ============================================

INSERT INTO district_election_results_2023 (city, district, party_slug, vote_count, vote_share) VALUES
${electionInserts.join(',\n')}
ON CONFLICT ON CONSTRAINT district_election_2023_city_district_party_idx
DO UPDATE SET vote_count = EXCLUDED.vote_count, vote_share = EXCLUDED.vote_share;
`;

  const outputPath = path.join(__dirname, 'seed-district-data.sql');
  fs.writeFileSync(outputPath, sql, 'utf-8');
  console.log(`Generated ${outputPath}`);
  console.log(`  ${cityCount} cities, ${districtCount} districts`);
  console.log(`  ${voterInserts.length} voter count rows`);
  console.log(`  ${electionInserts.length} election result rows`);
}

main();
