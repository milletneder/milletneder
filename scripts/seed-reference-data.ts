import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // --- reference_demographics tablosu ---

    // Yaş dağılımı (TÜİK 2025 — 18+ seçmen nüfusu tahmini)
    const ageDist = [
      { category: 'Y1', share: 0.138000, label: '18-24' },
      { category: 'Y2', share: 0.195000, label: '25-34' },
      { category: 'Y3', share: 0.190000, label: '35-44' },
      { category: 'Y4', share: 0.175000, label: '45-54' },
      { category: 'Y5', share: 0.155000, label: '55-64' },
      { category: 'Y6', share: 0.147000, label: '65+' },
    ];

    for (const d of ageDist) {
      await client.query(
        `INSERT INTO reference_demographics (dimension, category, population_share, source, year)
         VALUES ('age', $1, $2, 'TÜİK 2025 (18+ seçmen tahmini)', 2025)
         ON CONFLICT (dimension, category) DO UPDATE SET population_share = $2, updated_at = NOW()`,
        [d.category, d.share]
      );
    }
    console.log(`✓ Yaş dağılımı: ${ageDist.length} kayıt`);

    // Cinsiyet dağılımı (TÜİK 2025)
    const genderDist = [
      { category: 'E', share: 0.502000 },
      { category: 'K', share: 0.498000 },
    ];

    for (const d of genderDist) {
      await client.query(
        `INSERT INTO reference_demographics (dimension, category, population_share, source, year)
         VALUES ('gender', $1, $2, 'TÜİK 2025', 2025)
         ON CONFLICT (dimension, category) DO UPDATE SET population_share = $2, updated_at = NOW()`,
        [d.category, d.share]
      );
    }
    console.log(`✓ Cinsiyet dağılımı: ${genderDist.length} kayıt`);

    // Eğitim dağılımı (TÜİK 2024 — 25+ yaş eğitim istatistikleri)
    const educDist = [
      { category: 'E1', share: 0.195000, label: 'İlkokul veya altı' },
      { category: 'E2', share: 0.155000, label: 'Ortaokul' },
      { category: 'E3', share: 0.270000, label: 'Lise' },
      { category: 'E4', share: 0.300000, label: 'Üniversite' },
      { category: 'E5', share: 0.080000, label: 'Lisansüstü' },
    ];

    for (const d of educDist) {
      await client.query(
        `INSERT INTO reference_demographics (dimension, category, population_share, source, year)
         VALUES ('education', $1, $2, 'TÜİK 2024 Eğitim İstatistikleri', 2024)
         ON CONFLICT (dimension, category) DO UPDATE SET population_share = $2, updated_at = NOW()`,
        [d.category, d.share]
      );
    }
    console.log(`✓ Eğitim dağılımı: ${educDist.length} kayıt`);

    // Bölgesel seçmen dağılımı (YSK 2023 kayıtlı seçmen)
    const regionDist = [
      { category: 'marmara', share: 0.280000 },
      { category: 'ic_anadolu', share: 0.170000 },
      { category: 'ege', share: 0.130000 },
      { category: 'akdeniz', share: 0.130000 },
      { category: 'karadeniz', share: 0.110000 },
      { category: 'guneydogu', share: 0.100000 },
      { category: 'dogu', share: 0.080000 },
    ];

    for (const d of regionDist) {
      await client.query(
        `INSERT INTO reference_demographics (dimension, category, population_share, source, year)
         VALUES ('region', $1, $2, 'YSK 2023 Kayıtlı Seçmen', 2023)
         ON CONFLICT (dimension, category) DO UPDATE SET population_share = $2, updated_at = NOW()`,
        [d.category, d.share]
      );
    }
    console.log(`✓ Bölgesel dağılım: ${regionDist.length} kayıt`);

    // --- election_results_2023 tablosu ---
    // 2023 Cumhurbaşkanlığı 1. tur milletvekili seçim sonuçları (YSK resmi)
    const electionResults = [
      { slug: 'ak-parti', share: 0.356200, count: 20179000 },
      { slug: 'chp', share: 0.253400, count: 14359000 },
      { slug: 'mhp', share: 0.101000, count: 5722000 },
      { slug: 'yesil-sol', share: 0.088000, count: 4985000 },
      { slug: 'iyi-parti', share: 0.098300, count: 5567000 },
      { slug: 'tip', share: 0.018500, count: 1048000 },
      { slug: 'bbp', share: 0.010200, count: 578000 },
      { slug: 'yeniden-refah', share: 0.050500, count: 2861000 },
      { slug: 'zafer-partisi', share: 0.022200, count: 1258000 },
      { slug: 'memleket-partisi', share: 0.003200, count: 181000 },
    ];

    // Önce mevcut verileri temizle
    await client.query('DELETE FROM election_results_2023');

    for (const r of electionResults) {
      await client.query(
        `INSERT INTO election_results_2023 (party_slug, vote_share, vote_count, source)
         VALUES ($1, $2, $3, 'YSK 2023 Milletvekili Seçimi')`,
        [r.slug, r.share, r.count]
      );
    }
    console.log(`✓ 2023 seçim sonuçları: ${electionResults.length} parti`);

    // --- Varsayılan weighting_configs (global defaults) ---
    const defaultConfigs = [
      {
        key: 'post_stratification',
        enabled: false,
        params: { dimensions: ['age', 'gender', 'region'] },
      },
      {
        key: 'raking',
        enabled: false,
        params: { dimensions: ['age', 'gender', 'region', 'education'], maxIterations: 50, convergenceThreshold: 0.001 },
      },
      {
        key: 'turnout',
        enabled: false,
        params: { weights: { T1: 1.0, T2: 0.6, T3: 0.3, T4: 0.0 } },
      },
      {
        key: 'recency',
        enabled: false,
        params: { lambda: 0.01 },
      },
      {
        key: 'bayesian',
        enabled: false,
        params: { minSampleSize: 30, priorStrength: 10 },
      },
      {
        key: 'partisan_bias',
        enabled: false,
        params: {},
      },
      {
        key: 'regional_quota',
        enabled: false,
        params: {},
      },
      {
        key: 'fraud_detection',
        enabled: true,
        params: {
          ipSubnetThreshold: 3,
          ipSubnetMaxScore: 25,
          vpnScore: 20,
          youngAccountScore: 10,
          youngAccountHours: 1,
          disposableEmailScore: 15,
          sequentialEmailScore: 10,
          emptyProfileScore: 5,
          suspiciousUaScore: 15,
        },
      },
      {
        key: 'weight_cap',
        enabled: true,
        params: { min: 0.2, max: 5.0 },
      },
    ];

    for (const c of defaultConfigs) {
      await client.query(
        `INSERT INTO weighting_configs (round_id, config_key, is_enabled, parameters)
         VALUES (NULL, $1, $2, $3)
         ON CONFLICT (round_id, config_key) DO UPDATE SET is_enabled = $2, parameters = $3, updated_at = NOW()`,
        [c.key, c.enabled, JSON.stringify(c.params)]
      );
    }
    console.log(`✓ Varsayılan ağırlıklandırma konfigürasyonu: ${defaultConfigs.length} kayıt`);

    await client.query('COMMIT');
    console.log('\n✅ Tüm referans veriler başarıyla yüklendi.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
