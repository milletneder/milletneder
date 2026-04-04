import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Türkiye'de seçime girebilen tüm partiler (YSK kayıtlı, 2024 güncel)
// Oy alabilecek büyük partiler + küçük partiler
const ALL_PARTIES = [
  // Ana partiler (halihazırda mevcut — güncelle)
  { slug: 'ak-parti', name: 'Adalet ve Kalkınma Partisi', short_name: 'AK Parti', color: '#F28C28', text_color: '#ffffff', sort_order: 1 },
  { slug: 'chp', name: 'Cumhuriyet Halk Partisi', short_name: 'CHP', color: '#E30A17', text_color: '#ffffff', sort_order: 2 },
  { slug: 'mhp', name: 'Milliyetçi Hareket Partisi', short_name: 'MHP', color: '#195af0', text_color: '#ffffff', sort_order: 3 },
  { slug: 'iyi', name: 'İYİ Parti', short_name: 'İYİ', color: '#0070C0', text_color: '#ffffff', sort_order: 4 },
  { slug: 'dem', name: 'Halkların Eşitlik ve Demokrasi Partisi', short_name: 'DEM', color: '#8B008B', text_color: '#ffffff', sort_order: 5 },
  { slug: 'yeniden-refah', name: 'Yeniden Refah Partisi', short_name: 'YRP', color: '#006400', text_color: '#ffffff', sort_order: 6 },
  { slug: 'tip', name: 'Türkiye İşçi Partisi', short_name: 'TİP', color: '#8B0000', text_color: '#ffffff', sort_order: 7 },
  { slug: 'deva', name: 'Demokrasi ve Atılım Partisi', short_name: 'DEVA', color: '#008B8B', text_color: '#ffffff', sort_order: 8 },
  { slug: 'gelecek', name: 'Gelecek Partisi', short_name: 'GP', color: '#4169E1', text_color: '#ffffff', sort_order: 9 },
  { slug: 'saadet', name: 'Saadet Partisi', short_name: 'SP', color: '#228B22', text_color: '#ffffff', sort_order: 10 },
  { slug: 'zafer', name: 'Zafer Partisi', short_name: 'ZP', color: '#000080', text_color: '#ffffff', sort_order: 11 },
  { slug: 'memleket', name: 'Memleket Partisi', short_name: 'MP', color: '#800020', text_color: '#ffffff', sort_order: 12 },

  // Küçük partiler (yeni eklenecek)
  { slug: 'bbp', name: 'Büyük Birlik Partisi', short_name: 'BBP', color: '#C41E3A', text_color: '#ffffff', sort_order: 13 },
  { slug: 'dp', name: 'Demokrat Parti', short_name: 'DP', color: '#4B0082', text_color: '#ffffff', sort_order: 14 },
  { slug: 'dsp', name: 'Demokratik Sol Parti', short_name: 'DSP', color: '#B22222', text_color: '#ffffff', sort_order: 15 },
  { slug: 'huda-par', name: 'HÜDA PAR', short_name: 'HÜDA PAR', color: '#2E8B57', text_color: '#ffffff', sort_order: 16 },
  { slug: 'btp', name: 'Bağımsız Türkiye Partisi', short_name: 'BTP', color: '#8B4513', text_color: '#ffffff', sort_order: 17 },
  { slug: 'sol', name: 'Sol Parti', short_name: 'SOL', color: '#DC143C', text_color: '#ffffff', sort_order: 18 },
  { slug: 'emep', name: 'Emek Partisi', short_name: 'EMEP', color: '#FF4500', text_color: '#ffffff', sort_order: 19 },
  { slug: 'tkp', name: 'Türkiye Komünist Partisi', short_name: 'TKP', color: '#CC0000', text_color: '#ffffff', sort_order: 20 },
  { slug: 'hkp', name: 'Halkın Kurtuluş Partisi', short_name: 'HKP', color: '#B30000', text_color: '#ffffff', sort_order: 21 },
  { slug: 'milli-yol', name: 'Milli Yol Partisi', short_name: 'MYP', color: '#556B2F', text_color: '#ffffff', sort_order: 22 },
  { slug: 'anap', name: 'Anavatan Partisi', short_name: 'ANAP', color: '#FFD700', text_color: '#000000', sort_order: 23 },
  { slug: 'tkh', name: 'Türkiye Komünist Hareketi', short_name: 'TKH', color: '#990000', text_color: '#ffffff', sort_order: 24 },
  { slug: 'ytp', name: 'Yeni Türkiye Partisi', short_name: 'YTP', color: '#2F4F4F', text_color: '#ffffff', sort_order: 25 },
  { slug: 'adp', name: 'Anadolu Partisi', short_name: 'ADP', color: '#8FBC8F', text_color: '#000000', sort_order: 26 },
  { slug: 'abp', name: 'Adalet Birlik Partisi', short_name: 'ABP', color: '#708090', text_color: '#ffffff', sort_order: 27 },
  { slug: 'ab-parti', name: 'Aydınlık Birlik Partisi', short_name: 'AB Parti', color: '#696969', text_color: '#ffffff', sort_order: 28 },
  { slug: 'ap', name: 'Adalet Partisi', short_name: 'AP', color: '#483D8B', text_color: '#ffffff', sort_order: 29 },
  { slug: 'gbp', name: 'Genç Parti', short_name: 'GBP', color: '#DAA520', text_color: '#000000', sort_order: 30 },
  { slug: 'hak-par', name: 'Hak ve Özgürlükler Partisi', short_name: 'HAK-PAR', color: '#6B8E23', text_color: '#ffffff', sort_order: 31 },
  { slug: 'ocak', name: 'Ocak Partisi', short_name: 'OCAK', color: '#A0522D', text_color: '#ffffff', sort_order: 32 },
  { slug: 'vp', name: 'Vatan Partisi', short_name: 'VP', color: '#800000', text_color: '#ffffff', sort_order: 33 },

  // Diğer (catch-all)
  { slug: 'diger', name: 'Diğer / Bağımsız', short_name: 'DİĞER', color: '#555555', text_color: '#ffffff', sort_order: 99 },
];

async function run() {
  const client = await pool.connect();

  try {
    console.log('=== PARTİ VE AĞIRLIKLANDIRMA GÜNCELLEMESİ ===\n');

    // 1. Tüm partileri ekle/güncelle
    console.log('1. Partiler ekleniyor/güncelleniyor...');
    let inserted = 0;
    let updated = 0;

    // Logo dosyaları slug eşleştirmesi
    const LOGO_MAP: Record<string, string> = {
      'ak-parti': '/parties/ak-parti.webp',
      'chp': '/parties/chp.webp',
      'mhp': '/parties/mhp.webp',
      'iyi': '/parties/iyi-parti.webp',
      'dem': '/parties/dem-parti.webp',
      'yeniden-refah': '/parties/yrp.webp',
      'tip': '/parties/tip.webp',
      'deva': '/parties/deva.webp',
      'gelecek': '/parties/gelecek.webp',
      'saadet': '/parties/saadet.webp',
      'zafer': '/parties/zp.webp',
      'memleket': '/parties/memleket.webp',
      'bbp': '/parties/bbp.webp',
      'dp': '/parties/dp.webp',
      'dsp': '/parties/dsp.webp',
      'huda-par': '/parties/huda-par.webp',
      'btp': '/parties/btp.webp',
      'sol': '/parties/sol.webp',
      'emep': '/parties/emep.webp',
      'tkp': '/parties/tkp.webp',
      'hkp': '/parties/hkp.webp',
      'milli-yol': '/parties/milli-yol.webp',
      'anap': '/parties/anap.webp',
      'tkh': '/parties/tkh.webp',
      'ytp': '/parties/ytp.webp',
      'adp': '/parties/adp.webp',
      'abp': '/parties/abp.webp',
      'ab-parti': '/parties/ab-parti.webp',
      'ap': '/parties/ap.webp',
      'gbp': '/parties/gbp.webp',
      'hak-par': '/parties/hak-par.webp',
      'ocak': '/parties/ocak.webp',
      'vp': '/parties/vp.webp',
    };

    for (const p of ALL_PARTIES) {
      const logoUrl = LOGO_MAP[p.slug] || null;
      const result = await client.query(
        `INSERT INTO parties (slug, name, short_name, color, text_color, logo_url, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           short_name = EXCLUDED.short_name,
           color = EXCLUDED.color,
           text_color = EXCLUDED.text_color,
           logo_url = COALESCE(EXCLUDED.logo_url, parties.logo_url),
           sort_order = EXCLUDED.sort_order,
           is_active = true
         RETURNING (xmax = 0) as is_new`,
        [p.slug, p.name, p.short_name, p.color, p.text_color, logoUrl, p.sort_order]
      );
      if (result.rows[0].is_new) inserted++;
      else updated++;
    }

    console.log(`   ✓ ${inserted} yeni parti eklendi, ${updated} parti güncellendi`);

    // 2. Mevcut dummy kullanıcıları yeni alanlarla güncelle
    console.log('\n2. Dummy kullanıcılar güncelleniyor (gender, education, turnout, 2023 oyu)...');

    // Yaş-eğitim korelasyonu
    const educationByAge: Record<string, number[]> = {
      'Y1': [5, 8, 25, 45, 17],   // gençlerde üniversite yüksek
      'Y2': [8, 10, 25, 40, 17],
      'Y3': [12, 12, 28, 35, 13],
      'Y4': [18, 14, 28, 28, 12],
      'Y5': [25, 16, 28, 22, 9],
      'Y6': [30, 18, 28, 18, 6],  // yaşlılarda ilkokul yüksek
    };

    const educationLevels = ['E1', 'E2', 'E3', 'E4', 'E5'];
    const turnoutOptions = ['T1', 'T2', 'T3', 'T4'];
    const turnoutWeights = [55, 25, 12, 8];
    const genderWeights = [50.2, 49.8];

    function weightedPick<T>(items: T[], weights: number[]): T {
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    }

    // 2023 parti geçiş mantığı
    function pick2023Vote(currentSlug: string): string {
      const r = Math.random();
      if (r < 0.05) return 'yok';
      if (r < 0.70) return currentSlug;
      const transitions: Record<string, string[]> = {
        'chp': ['iyi', 'tip', 'dem'],
        'ak-parti': ['mhp', 'yeniden-refah', 'saadet'],
        'mhp': ['ak-parti', 'iyi', 'bbp'],
        'iyi': ['chp', 'mhp'],
        'dem': ['chp', 'tip'],
        'yeniden-refah': ['ak-parti', 'saadet', 'mhp'],
        'tip': ['chp', 'dem'],
      };
      if (r < 0.85) {
        const nearby = transitions[currentSlug] || ['chp', 'ak-parti'];
        return nearby[Math.floor(Math.random() * nearby.length)];
      }
      const mainParties = ['chp', 'ak-parti', 'mhp', 'iyi', 'dem', 'yeniden-refah'];
      return mainParties[Math.floor(Math.random() * mainParties.length)];
    }

    // Tüm dummy kullanıcıları çek
    const dummyUsers = await client.query(
      `SELECT u.id, u.age_bracket, v.party
       FROM users u
       LEFT JOIN votes v ON v.user_id = u.id AND v.is_valid = true
       WHERE u.is_dummy = true`
    );

    let userUpdated = 0;
    await client.query('BEGIN');

    for (const user of dummyUsers.rows) {
      const age = user.age_bracket || 'Y3';
      const gender = weightedPick(['E', 'K'], genderWeights);
      const eduWeights = educationByAge[age] || educationByAge['Y3'];
      const education = weightedPick(educationLevels, eduWeights);
      const turnout = weightedPick(turnoutOptions, turnoutWeights);
      const prev2023 = pick2023Vote(user.party || 'chp');

      await client.query(
        `UPDATE users SET gender = $1, education = $2, turnout_intention = $3, previous_vote_2023 = $4 WHERE id = $5`,
        [gender, education, turnout, prev2023, user.id]
      );
      userUpdated++;
    }

    await client.query('COMMIT');
    console.log(`   ✓ ${userUpdated} dummy kullanıcı güncellendi`);

    // 3. Fraud scores oluştur (dummy veriler için)
    console.log('\n3. Fraud skorları oluşturuluyor...');

    await client.query('BEGIN');

    // Temiz kullanıcılar: 0-20 arası düşük skor
    const cleanUsers = await client.query(
      `SELECT id FROM users WHERE is_dummy = true AND is_flagged = false`
    );
    let fraudCreated = 0;
    for (const u of cleanUsers.rows) {
      const score = (Math.random() * 20).toFixed(2);
      const factors = JSON.stringify({
        ipSubnet: Math.random() < 0.1 ? 10 : 0,
        vpn: 0,
        youngAccount: Math.random() < 0.3 ? 5 : 0,
        disposableEmail: 0,
        sequentialEmail: 0,
        emptyProfile: 0,
        suspiciousUa: 0,
      });
      await client.query(
        `INSERT INTO fraud_scores (user_id, score, factors, is_vpn, last_calculated)
         VALUES ($1, $2, $3, false, NOW())
         ON CONFLICT (user_id) DO UPDATE SET score = EXCLUDED.score, factors = EXCLUDED.factors, last_calculated = NOW()`,
        [u.id, score, factors]
      );
      fraudCreated++;
    }

    // Flagged kullanıcılar: 60-100 arası yüksek skor
    const flaggedUsers = await client.query(
      `SELECT id FROM users WHERE is_dummy = true AND is_flagged = true`
    );
    for (const u of flaggedUsers.rows) {
      const score = (60 + Math.random() * 40).toFixed(2);
      const isVpn = Math.random() > 0.5;
      const factors = JSON.stringify({
        ipSubnet: Math.random() > 0.3 ? 15 : 0,
        vpn: isVpn ? 20 : 0,
        youngAccount: 10,
        disposableEmail: Math.random() > 0.5 ? 15 : 0,
        sequentialEmail: Math.random() > 0.7 ? 10 : 0,
        emptyProfile: 0,
        suspiciousUa: Math.random() > 0.6 ? 15 : 0,
      });
      await client.query(
        `INSERT INTO fraud_scores (user_id, score, factors, is_vpn, last_calculated)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id) DO UPDATE SET score = EXCLUDED.score, factors = EXCLUDED.factors, is_vpn = EXCLUDED.is_vpn, last_calculated = NOW()`,
        [u.id, score, factors, isVpn]
      );
      fraudCreated++;
    }

    await client.query('COMMIT');
    console.log(`   ✓ ${fraudCreated} fraud skoru oluşturuldu`);

    // 4. Tüm ağırlıklandırma yöntemlerini aktif et
    console.log('\n4. Ağırlıklandırma yöntemleri aktifleştiriliyor...');

    const weightingConfigs = [
      { key: 'post_stratification', enabled: false, params: { dimensions: ['age', 'gender', 'education', 'region'] } },
      { key: 'raking', enabled: true, params: { dimensions: ['age', 'gender', 'education', 'region'], maxIterations: 50, convergenceThreshold: 0.001 } },
      { key: 'regional_quota', enabled: true, params: {} },
      { key: 'turnout', enabled: true, params: { weights: { T1: 1.0, T2: 0.6, T3: 0.3, T4: 0.0 } } },
      { key: 'recency', enabled: true, params: { lambda: 0.01 } },
      { key: 'bayesian', enabled: true, params: { minSampleSize: 30, priorStrength: 10 } },
      { key: 'partisan_bias', enabled: true, params: {} },
      { key: 'fraud_detection', enabled: true, params: { threshold: 80 } },
      { key: 'weight_cap', enabled: true, params: { min: 0.2, max: 5.0 } },
    ];

    for (const c of weightingConfigs) {
      await client.query(
        `INSERT INTO weighting_configs (round_id, config_key, is_enabled, parameters)
         VALUES (NULL, $1, $2, $3)
         ON CONFLICT ON CONSTRAINT weighting_configs_round_id_config_key_key DO UPDATE SET
           is_enabled = EXCLUDED.is_enabled,
           parameters = EXCLUDED.parameters,
           updated_at = NOW()`,
        [c.key, c.enabled, JSON.stringify(c.params)]
      );
    }

    // Post-strat kapalı çünkü Raking aktif (ikisi aynı anda çalışmaz)
    console.log('   ✓ Raking (IPF): AKTİF');
    console.log('   ✓ Bölgesel Kota: AKTİF');
    console.log('   ✓ Katılım Niyeti: AKTİF');
    console.log('   ✓ Zaman Ağırlığı: AKTİF');
    console.log('   ✓ Bayesian Düzeltme: AKTİF');
    console.log('   ✓ Partizan Sapma: AKTİF');
    console.log('   ✓ Sahtecilik Tespiti: AKTİF');
    console.log('   ✓ Ağırlık Sınırı: AKTİF');
    console.log('   - Post-Stratification: PASİF (Raking aktif olduğu için)');

    // 5. Cache temizle
    await client.query('DELETE FROM weighted_results_cache');
    console.log('\n5. ✓ Sonuç cache temizlendi');

    // Özet
    const partyCount = await client.query('SELECT COUNT(*) as cnt FROM parties WHERE is_active = true');
    const userCount = await client.query('SELECT COUNT(*) as cnt FROM users WHERE is_dummy = true');
    const fraudCount = await client.query('SELECT COUNT(*) as cnt FROM fraud_scores');

    console.log('\n=== ÖZET ===');
    console.log(`Aktif parti sayısı: ${partyCount.rows[0].cnt}`);
    console.log(`Dummy kullanıcı sayısı: ${userCount.rows[0].cnt}`);
    console.log(`Fraud skoru olan kullanıcı: ${fraudCount.rows[0].cnt}`);
    console.log('Tüm ağırlıklandırma yöntemleri aktif ✓');

  } catch (error) {
    console.error('Hata:', error);
    await client.query('ROLLBACK').catch(() => {});
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
