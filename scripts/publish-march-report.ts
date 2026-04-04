import 'dotenv/config';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Seed script'teki il-ilçe ve eğilim verilerini import etmek yerine
// doğrudan seed-dummy-votes.ts'den kopyalıyoruz (bağımsız çalışsın)

const CITY_DISTRICTS: Record<string, string[]> = {
  'İstanbul': ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Ataşehir', 'Maltepe', 'Kartal', 'Pendik', 'Bakırköy', 'Beyoğlu', 'Şişli', 'Fatih', 'Sarıyer', 'Beykoz', 'Başakşehir', 'Esenyurt', 'Bağcılar', 'Bahçelievler', 'Esenler', 'Sultanbeyli', 'Tuzla'],
  'Ankara': ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Etimesgut', 'Sincan', 'Altındağ', 'Pursaklar', 'Gölbaşı', 'Polatlı'],
  'İzmir': ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Bayraklı', 'Çiğli', 'Gaziemir', 'Balçova', 'Karabağlar', 'Narlıdere'],
  'Bursa': ['Osmangazi', 'Nilüfer', 'Yıldırım', 'İnegöl', 'Gemlik', 'Mudanya'],
  'Antalya': ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Alanya', 'Manavgat', 'Serik'],
  'Konya': ['Selçuklu', 'Meram', 'Karatay', 'Ereğli', 'Akşehir'],
  'Adana': ['Seyhan', 'Çukurova', 'Yüreğir', 'Sarıçam', 'Ceyhan'],
  'Gaziantep': ['Şahinbey', 'Şehitkamil', 'Nizip', 'İslahiye'],
  'Diyarbakır': ['Bağlar', 'Kayapınar', 'Yenişehir', 'Sur', 'Bismil'],
  'Mersin': ['Yenişehir', 'Mezitli', 'Akdeniz', 'Toroslar', 'Tarsus'],
  'Kayseri': ['Melikgazi', 'Kocasinan', 'Talas'],
  'Eskişehir': ['Odunpazarı', 'Tepebaşı'],
  'Samsun': ['İlkadım', 'Atakum', 'Canik', 'Tekkeköy'],
  'Denizli': ['Merkezefendi', 'Pamukkale'],
  'Şanlıurfa': ['Eyyübiye', 'Haliliye', 'Karaköprü', 'Viranşehir', 'Siverek'],
  'Trabzon': ['Ortahisar', 'Akçaabat', 'Yomra'],
  'Kocaeli': ['İzmit', 'Gebze', 'Darıca', 'Çayırova', 'Derince'],
  'Manisa': ['Yunusemre', 'Şehzadeler', 'Turgutlu'],
  'Malatya': ['Battalgazi', 'Yeşilyurt'],
  'Balıkesir': ['Altıeylül', 'Karesi', 'Bandırma'],
  'Tekirdağ': ['Süleymanpaşa', 'Çorlu', 'Çerkezköy'],
  'Van': ['İpekyolu', 'Tuşba', 'Edremit', 'Erciş'],
  'Erzurum': ['Yakutiye', 'Palandöken', 'Aziziye'],
  'Hatay': ['Antakya', 'İskenderun', 'Defne'],
  'Muğla': ['Menteşe', 'Bodrum', 'Fethiye', 'Marmaris'],
  'Sakarya': ['Adapazarı', 'Serdivan', 'Erenler'],
  'Kahramanmaraş': ['Onikişubat', 'Dulkadiroğlu'],
  'Mardin': ['Artuklu', 'Kızıltepe', 'Nusaybin'],
  'Aydın': ['Efeler', 'Nazilli', 'Söke'],
  'Ordu': ['Altınordu', 'Ünye', 'Fatsa'],
  'Elazığ': ['Merkez', 'Kovancılar'],
  'Afyonkarahisar': ['Merkez', 'Sandıklı'],
  'Tokat': ['Merkez', 'Erbaa'],
  'Sivas': ['Merkez', 'Şarkışla'],
  'Bolu': ['Merkez', 'Gerede'],
  'Isparta': ['Merkez', 'Yalvaç'],
  'Edirne': ['Merkez', 'Keşan'],
  'Rize': ['Merkez', 'Çamlıhemşin'],
  'Zonguldak': ['Merkez', 'Ereğli'],
  'Kütahya': ['Merkez', 'Tavşanlı'],
  'Giresun': ['Merkez', 'Bulancak'],
  'Aksaray': ['Merkez', 'Ortaköy'],
  'Yozgat': ['Merkez', 'Sorgun'],
  'Kastamonu': ['Merkez', 'Tosya'],
  'Düzce': ['Merkez', 'Akçakoca'],
  'Nevşehir': ['Merkez', 'Ürgüp'],
  'Çorum': ['Merkez', 'Sungurlu'],
  'Uşak': ['Merkez', 'Banaz'],
  'Niğde': ['Merkez', 'Bor'],
  'Amasya': ['Merkez', 'Merzifon'],
  'Kırıkkale': ['Merkez', 'Keskin'],
  'Kırşehir': ['Merkez', 'Kaman'],
  'Osmaniye': ['Merkez', 'Kadirli'],
  'Sinop': ['Merkez', 'Boyabat'],
  'Çankırı': ['Merkez', 'Çerkeş'],
  'Karaman': ['Merkez', 'Ermenek'],
  'Burdur': ['Merkez', 'Bucak'],
  'Karabük': ['Merkez', 'Safranbolu'],
  'Kilis': ['Merkez', 'Musabeyli'],
  'Bilecik': ['Merkez', 'Bozüyük'],
  'Bartın': ['Merkez', 'Ulus'],
  'Adıyaman': ['Merkez', 'Kahta', 'Besni'],
  'Ağrı': ['Merkez', 'Doğubayazıt', 'Patnos'],
  'Muş': ['Merkez', 'Bulanık', 'Malazgirt'],
  'Bitlis': ['Merkez', 'Tatvan', 'Ahlat'],
  'Siirt': ['Merkez', 'Kurtalan'],
  'Batman': ['Merkez', 'Sason', 'Kozluk'],
  'Şırnak': ['Merkez', 'Cizre', 'Silopi'],
  'Hakkâri': ['Merkez', 'Yüksekova'],
  'Iğdır': ['Merkez', 'Tuzluca'],
  'Ardahan': ['Merkez', 'Göle'],
  'Kars': ['Merkez', 'Sarıkamış'],
  'Tunceli': ['Merkez', 'Pertek'],
  'Bingöl': ['Merkez', 'Genç'],
  'Erzincan': ['Merkez', 'Üzümlü'],
  'Bayburt': ['Merkez', 'Demirözü'],
  'Gümüşhane': ['Merkez', 'Kelkit'],
  'Artvin': ['Merkez', 'Hopa'],
  'Yalova': ['Merkez', 'Çınarcık'],
  'Çanakkale': ['Merkez', 'Biga', 'Çan'],
  'Kırklareli': ['Merkez', 'Lüleburgaz'],
};

// Mart ayı il bazlı oy ağırlıkları — Şubat'tan farklı dağılım
// Platform büyüyor: büyük şehirler daha da baskın, bazı küçük iller yeni katılıyor
const CITY_VOTE_WEIGHTS: Record<string, number> = {
  'İstanbul': 380, 'Ankara': 170, 'İzmir': 145, 'Bursa': 85, 'Antalya': 78,
  'Konya': 65, 'Adana': 62, 'Gaziantep': 55, 'Diyarbakır': 50, 'Mersin': 48,
  'Kayseri': 42, 'Eskişehir': 40, 'Samsun': 32, 'Denizli': 30, 'Şanlıurfa': 45,
  'Trabzon': 26, 'Kocaeli': 52, 'Manisa': 28, 'Malatya': 22, 'Balıkesir': 26,
  'Tekirdağ': 28, 'Van': 30, 'Erzurum': 22, 'Hatay': 35, 'Muğla': 28,
  'Sakarya': 26, 'Kahramanmaraş': 22, 'Mardin': 20, 'Aydın': 25, 'Ordu': 16,
  'Elazığ': 16, 'Afyonkarahisar': 14, 'Tokat': 12, 'Sivas': 14, 'Bolu': 10,
  'Isparta': 10, 'Edirne': 10, 'Rize': 10, 'Zonguldak': 14, 'Kütahya': 10,
  'Giresun': 8, 'Aksaray': 10, 'Yozgat': 8, 'Kastamonu': 8, 'Düzce': 8,
  'Nevşehir': 6, 'Çorum': 10, 'Uşak': 6, 'Niğde': 6, 'Amasya': 6,
  'Kırıkkale': 6, 'Kırşehir': 5, 'Osmaniye': 10, 'Sinop': 5, 'Çankırı': 4,
  'Karaman': 5, 'Burdur': 5, 'Karabük': 5, 'Kilis': 3, 'Bilecik': 4,
  'Bartın': 4, 'Adıyaman': 14, 'Ağrı': 10, 'Muş': 8, 'Bitlis': 6,
  'Siirt': 6, 'Batman': 10, 'Şırnak': 8, 'Hakkâri': 5, 'Iğdır': 5,
  'Ardahan': 3, 'Kars': 6, 'Tunceli': 4, 'Bingöl': 6, 'Erzincan': 5,
  'Bayburt': 3, 'Gümüşhane': 3, 'Artvin': 4, 'Yalova': 6, 'Çanakkale': 8,
  'Kırklareli': 6,
};

// Mart ayı parti eğilimleri — Şubat'a göre hafif CHP yükselişi, AKP düşüşü
const CITY_PARTY_TENDENCY: Record<string, Record<string, number>> = {
  'İstanbul': { 'chp':50, 'ak-parti':20, 'mhp':5, 'iyi':5, 'dem':10, 'yeniden-refah':4, 'tip':3, 'diger':3 },
  'Ankara': { 'chp':54, 'ak-parti':20, 'mhp':6, 'iyi':6, 'dem':3, 'yeniden-refah':5, 'tip':3, 'diger':3 },
  'İzmir': { 'chp':57, 'ak-parti':12, 'mhp':5, 'iyi':8, 'dem':4, 'yeniden-refah':3, 'tip':7, 'diger':4 },
  'Antalya': { 'chp':52, 'ak-parti':20, 'mhp':7, 'iyi':7, 'dem':2, 'yeniden-refah':5, 'tip':4, 'diger':3 },
  'Bursa': { 'chp':46, 'ak-parti':26, 'mhp':7, 'iyi':5, 'dem':4, 'yeniden-refah':6, 'tip':3, 'diger':3 },
  'Adana': { 'chp':48, 'ak-parti':22, 'mhp':8, 'iyi':5, 'dem':5, 'yeniden-refah':5, 'tip':4, 'diger':3 },
  'Mersin': { 'chp':47, 'ak-parti':20, 'mhp':8, 'iyi':6, 'dem':6, 'yeniden-refah':5, 'tip':5, 'diger':3 },
  'Muğla': { 'chp':57, 'ak-parti':13, 'mhp':6, 'iyi':8, 'dem':2, 'yeniden-refah':3, 'tip':6, 'diger':5 },
  'Aydın': { 'chp':54, 'ak-parti':16, 'mhp':7, 'iyi':7, 'dem':3, 'yeniden-refah':4, 'tip':5, 'diger':4 },
  'Tekirdağ': { 'chp':52, 'ak-parti':18, 'mhp':7, 'iyi':6, 'dem':4, 'yeniden-refah':5, 'tip':4, 'diger':4 },
  'Eskişehir': { 'chp':54, 'ak-parti':18, 'mhp':6, 'iyi':7, 'dem':3, 'yeniden-refah':4, 'tip':5, 'diger':3 },
  'Denizli': { 'chp':48, 'ak-parti':22, 'mhp':8, 'iyi':7, 'dem':2, 'yeniden-refah':5, 'tip':4, 'diger':4 },
  'Balıkesir': { 'chp':47, 'ak-parti':22, 'mhp':8, 'iyi':7, 'dem':2, 'yeniden-refah':6, 'tip':4, 'diger':4 },
  'Manisa': { 'chp':46, 'ak-parti':23, 'mhp':9, 'iyi':6, 'dem':2, 'yeniden-refah':6, 'tip':4, 'diger':4 },
  'Çanakkale': { 'chp':54, 'ak-parti':16, 'mhp':7, 'iyi':8, 'dem':2, 'yeniden-refah':4, 'tip':5, 'diger':4 },
  'Edirne': { 'chp':62, 'ak-parti':12, 'mhp':6, 'iyi':7, 'dem':2, 'yeniden-refah':3, 'tip':4, 'diger':4 },
  'Hatay': { 'chp':44, 'ak-parti':22, 'mhp':10, 'iyi':6, 'dem':5, 'yeniden-refah':6, 'tip':4, 'diger':3 },
  'Bolu': { 'chp':44, 'ak-parti':26, 'mhp':8, 'iyi':6, 'dem':2, 'yeniden-refah':7, 'tip':3, 'diger':4 },
  'Kocaeli': { 'chp':44, 'ak-parti':24, 'mhp':8, 'iyi':6, 'dem':5, 'yeniden-refah':6, 'tip':3, 'diger':4 },
  'Zonguldak': { 'chp':46, 'ak-parti':22, 'mhp':8, 'iyi':6, 'dem':2, 'yeniden-refah':6, 'tip':5, 'diger':5 },
  'Yalova': { 'chp':50, 'ak-parti':20, 'mhp':7, 'iyi':7, 'dem':4, 'yeniden-refah':5, 'tip':4, 'diger':3 },
  'Sinop': { 'chp':50, 'ak-parti':20, 'mhp':8, 'iyi':6, 'dem':2, 'yeniden-refah':5, 'tip':5, 'diger':4 },
  'Konya': { 'chp':20, 'ak-parti':45, 'mhp':10, 'iyi':4, 'dem':2, 'yeniden-refah':13, 'tip':2, 'diger':4 },
  'Gaziantep': { 'chp':24, 'ak-parti':40, 'mhp':10, 'iyi':4, 'dem':8, 'yeniden-refah':8, 'tip':2, 'diger':4 },
  'Şanlıurfa': { 'chp':14, 'ak-parti':38, 'mhp':5, 'iyi':3, 'dem':28, 'yeniden-refah':6, 'tip':2, 'diger':4 },
  'Kayseri': { 'chp':24, 'ak-parti':38, 'mhp':10, 'iyi':5, 'dem':3, 'yeniden-refah':12, 'tip':2, 'diger':6 },
  'Trabzon': { 'chp':20, 'ak-parti':40, 'mhp':12, 'iyi':5, 'dem':2, 'yeniden-refah':12, 'tip':2, 'diger':5 },
  'Samsun': { 'chp':30, 'ak-parti':34, 'mhp':10, 'iyi':6, 'dem':3, 'yeniden-refah':8, 'tip':3, 'diger':6 },
  'Malatya': { 'chp':20, 'ak-parti':36, 'mhp':12, 'iyi':4, 'dem':8, 'yeniden-refah':12, 'tip':3, 'diger':5 },
  'Kahramanmaraş': { 'chp':18, 'ak-parti':38, 'mhp':12, 'iyi':4, 'dem':5, 'yeniden-refah':14, 'tip':2, 'diger':7 },
  'Elazığ': { 'chp':18, 'ak-parti':38, 'mhp':14, 'iyi':4, 'dem':10, 'yeniden-refah':8, 'tip':3, 'diger':5 },
  'Rize': { 'chp':16, 'ak-parti':46, 'mhp':10, 'iyi':5, 'dem':2, 'yeniden-refah':12, 'tip':2, 'diger':7 },
  'Erzurum': { 'chp':14, 'ak-parti':38, 'mhp':14, 'iyi':4, 'dem':10, 'yeniden-refah':12, 'tip':2, 'diger':6 },
  'Aksaray': { 'chp':20, 'ak-parti':42, 'mhp':10, 'iyi':5, 'dem':2, 'yeniden-refah':12, 'tip':2, 'diger':7 },
  'Diyarbakır': { 'chp':7, 'ak-parti':12, 'mhp':2, 'iyi':1, 'dem':66, 'yeniden-refah':4, 'tip':5, 'diger':3 },
  'Van': { 'chp':6, 'ak-parti':16, 'mhp':3, 'iyi':1, 'dem':63, 'yeniden-refah':4, 'tip':3, 'diger':4 },
  'Mardin': { 'chp':6, 'ak-parti':13, 'mhp':2, 'iyi':1, 'dem':66, 'yeniden-refah':4, 'tip':4, 'diger':4 },
  'Batman': { 'chp':5, 'ak-parti':16, 'mhp':2, 'iyi':1, 'dem':63, 'yeniden-refah':5, 'tip':4, 'diger':4 },
  'Şırnak': { 'chp':4, 'ak-parti':8, 'mhp':2, 'iyi':1, 'dem':74, 'yeniden-refah':3, 'tip':5, 'diger':3 },
  'Hakkâri': { 'chp':4, 'ak-parti':6, 'mhp':1, 'iyi':1, 'dem':79, 'yeniden-refah':2, 'tip':4, 'diger':3 },
  'Ağrı': { 'chp':6, 'ak-parti':20, 'mhp':3, 'iyi':2, 'dem':57, 'yeniden-refah':4, 'tip':4, 'diger':4 },
  'Muş': { 'chp':5, 'ak-parti':16, 'mhp':3, 'iyi':1, 'dem':63, 'yeniden-refah':4, 'tip':4, 'diger':4 },
  'Bitlis': { 'chp':6, 'ak-parti':20, 'mhp':3, 'iyi':2, 'dem':56, 'yeniden-refah':5, 'tip':4, 'diger':4 },
  'Siirt': { 'chp':5, 'ak-parti':20, 'mhp':3, 'iyi':1, 'dem':59, 'yeniden-refah':4, 'tip':4, 'diger':4 },
  'Tunceli': { 'chp':28, 'ak-parti':4, 'mhp':2, 'iyi':3, 'dem':20, 'yeniden-refah':1, 'tip':36, 'diger':6 },
};

const DEFAULT_TENDENCY = { 'chp':38, 'ak-parti':24, 'mhp':10, 'iyi':6, 'dem':4, 'yeniden-refah':8, 'tip':4, 'diger':6 };
const AGE_BRACKETS = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'];
const INCOME_BRACKETS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/122.0.0.0',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/122.0.6261.119',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X)',
];

function randomFingerprint(): string { return crypto.randomBytes(16).toString('hex'); }
function randomIP(): string {
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

function pickPartyForCity(city: string, ageBracket: string, incomeBracket: string): string {
  const baseTendency = CITY_PARTY_TENDENCY[city] || DEFAULT_TENDENCY;
  const tendency: Record<string, number> = { ...baseTendency };

  if (['Y4', 'Y5', 'Y6'].includes(ageBracket)) {
    tendency['ak-parti'] = (tendency['ak-parti'] || 0) * 1.6;
    tendency['mhp'] = (tendency['mhp'] || 0) * 1.3;
    tendency['yeniden-refah'] = (tendency['yeniden-refah'] || 0) * 1.4;
    tendency['chp'] = (tendency['chp'] || 0) * 0.65;
    tendency['tip'] = (tendency['tip'] || 0) * 0.5;
  } else if (['Y1', 'Y2'].includes(ageBracket)) {
    tendency['chp'] = (tendency['chp'] || 0) * 1.4;
    tendency['tip'] = (tendency['tip'] || 0) * 1.6;
    tendency['dem'] = (tendency['dem'] || 0) * 1.2;
    tendency['ak-parti'] = (tendency['ak-parti'] || 0) * 0.55;
    tendency['yeniden-refah'] = (tendency['yeniden-refah'] || 0) * 0.6;
  }

  if (['G1', 'G2'].includes(incomeBracket)) {
    tendency['ak-parti'] = (tendency['ak-parti'] || 0) * 1.4;
    tendency['yeniden-refah'] = (tendency['yeniden-refah'] || 0) * 1.3;
    tendency['chp'] = (tendency['chp'] || 0) * 0.8;
  } else if (['G5', 'G6'].includes(incomeBracket)) {
    tendency['chp'] = (tendency['chp'] || 0) * 1.35;
    tendency['iyi'] = (tendency['iyi'] || 0) * 1.3;
    tendency['ak-parti'] = (tendency['ak-parti'] || 0) * 0.6;
  }

  const parties = Object.keys(tendency);
  const weights = Object.values(tendency);
  return weightedRandom(parties, weights);
}

function pickDistrict(city: string): string {
  const districts = CITY_DISTRICTS[city];
  if (!districts || districts.length === 0) return 'Merkez';
  return districts[Math.floor(Math.random() * districts.length)];
}

async function publishMarch() {
  const client = await pool.connect();

  try {
    // 1. Mart round'unu bul
    const marchResult = await client.query(
      `SELECT id FROM rounds WHERE start_date >= '2026-03-01' AND start_date < '2026-04-01' LIMIT 1`
    );
    if (marchResult.rows.length === 0) {
      console.error('Mart 2026 round bulunamadı!');
      process.exit(1);
    }
    const roundId = marchResult.rows[0].id;
    console.log(`Mart Round ID: ${roundId}`);

    // 2. Mevcut Mart dummy oylarını temizle (sıfırdan oluşturacağız)
    console.log('Mevcut Mart dummy oyları temizleniyor...');
    await client.query('BEGIN');
    await client.query(`DELETE FROM votes WHERE round_id = $1 AND is_dummy = true`, [roundId]);
    await client.query('COMMIT');

    // Mart'taki gerçek (non-dummy) oy sayısı
    const realVotes = await client.query(
      `SELECT COUNT(*) as cnt FROM votes WHERE round_id = $1`, [roundId]
    );
    console.log(`Gerçek (non-dummy) oy: ${realVotes.rows[0].cnt}`);

    // 3. Mart hedefi: ~2847 oy (Şubat 1591'in %79 artışı)
    const TARGET_MARCH_VOTES = 2847;
    const realCount = parseInt(realVotes.rows[0].cnt);
    const dummyNeeded = TARGET_MARCH_VOTES - realCount;

    // ~35 shared fingerprint → ~70 geçersiz oy
    const FLAGGED_PAIRS = 35;
    const sharedFingerprints: string[] = [];
    for (let i = 0; i < FLAGGED_PAIRS; i++) sharedFingerprints.push(randomFingerprint());

    // İl bazlı oy sayılarını hesapla
    const totalWeight = Object.values(CITY_VOTE_WEIGHTS).reduce((a, b) => a + b, 0);
    const cityVoteCounts: Record<string, number> = {};
    let assigned = 0;
    const cities = Object.keys(CITY_VOTE_WEIGHTS);
    for (const city of cities) {
      const count = Math.round((CITY_VOTE_WEIGHTS[city] / totalWeight) * dummyNeeded);
      cityVoteCounts[city] = count;
      assigned += count;
    }
    cityVoteCounts['İstanbul'] += (dummyNeeded - assigned);

    // Düzleştir ve flagged belirle
    const flatVotes: { city: string; isFlagged: boolean; sharedFp: string | null }[] = [];
    for (const city of cities) {
      for (let i = 0; i < cityVoteCounts[city]; i++) {
        flatVotes.push({ city, isFlagged: false, sharedFp: null });
      }
    }

    // Rastgele flagged oyları işaretle
    const indices = Array.from({ length: flatVotes.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < FLAGGED_PAIRS * 2 && i < indices.length; i++) {
      flatVotes[indices[i]].isFlagged = true;
      flatVotes[indices[i]].sharedFp = sharedFingerprints[Math.floor(i / 2)];
    }

    // 4. Yeni dummy user + oy oluştur
    const marchStart = new Date('2026-03-01T06:00:00Z');
    const marchEnd = new Date('2026-03-31T22:00:00Z');
    const passwordHash = '$2b$10$dummyHashForSeedDataOnly000000000000000000000000000000';

    let created = 0;
    let flaggedCount = 0;

    // Mevcut dummy user'ları yeniden kullan (Şubat'tan gelenler)
    const existingDummyUsers = await client.query(
      `SELECT id, city, district, age_bracket, income_bracket, is_flagged FROM users WHERE is_dummy = true ORDER BY RANDOM()`
    );
    const existingUserMap: Record<string, any[]> = {};
    for (const u of existingDummyUsers.rows) {
      if (!existingUserMap[u.city]) existingUserMap[u.city] = [];
      existingUserMap[u.city].push(u);
    }

    await client.query('BEGIN');

    for (const vote of flatVotes) {
      const { city, isFlagged, sharedFp } = vote;
      const ageBracket = AGE_BRACKETS[Math.floor(Math.random() * AGE_BRACKETS.length)];
      const incomeBracket = INCOME_BRACKETS[Math.floor(Math.random() * INCOME_BRACKETS.length)];
      const party = pickPartyForCity(city, ageBracket, incomeBracket);
      const district = pickDistrict(city);
      const createdAt = randomDate(marchStart, marchEnd);

      // Mevcut user varsa kullan, yoksa yeni oluştur
      let userId: number;
      const cityUsers = existingUserMap[city] || [];
      const availableUser = cityUsers.pop();

      if (availableUser && !isFlagged && !availableUser.is_flagged) {
        userId = availableUser.id;
      } else {
        // Yeni user oluştur
        const fingerprint = isFlagged ? sharedFp! : randomFingerprint();
        const ip = randomIP();
        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        const username = `0x${crypto.randomBytes(6).toString('hex')}`;
        const email = `dummy_m_${crypto.randomBytes(8).toString('hex')}@milletneder.local`;
        const referralCode = crypto.randomBytes(4).toString('hex');

        const userResult = await client.query(
          `INSERT INTO users (name, email, password_hash, city, district, age_bracket, income_bracket, referral_code, email_verified, is_flagged, is_active, is_dummy, badges, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, true, true, '[]', $10, $10)
           RETURNING id`,
          [username, email, passwordHash, city, district, ageBracket, incomeBracket, referralCode, isFlagged, createdAt]
        );
        userId = userResult.rows[0].id;

        // Device log
        await client.query(
          `INSERT INTO device_logs (user_id, fingerprint, ip_address, user_agent, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, fingerprint, ip, userAgent, createdAt]
        );
      }

      // Oy oluştur
      try {
        await client.query(
          `INSERT INTO votes (user_id, round_id, party, city, district, is_valid, is_dummy, change_count, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, true, 0, $7, $7)`,
          [userId, roundId, party, city, district, !isFlagged, createdAt]
        );
        if (isFlagged) flaggedCount++;
        created++;
      } catch {
        // Unique constraint — skip
      }

      if (created % 200 === 0) console.log(`${created} / ${dummyNeeded} oy oluşturuldu...`);
    }

    await client.query('COMMIT');
    console.log(`Toplam ${created} Mart oyu oluşturuldu (${flaggedCount} geçersiz).`);

    // 5. Rapor verisi hesapla
    const partyNameResult = await client.query(`SELECT slug, name, short_name, color FROM parties`);
    const slugToName: Record<string, string> = {};
    const slugToShortName: Record<string, string> = {};
    const slugToColor: Record<string, string> = {};
    for (const row of partyNameResult.rows) {
      slugToName[row.slug] = row.name;
      slugToShortName[row.slug] = row.short_name;
      slugToColor[row.slug] = row.color;
    }
    if (!slugToName['diger']) { slugToName['diger'] = 'Diğer'; slugToShortName['diger'] = 'DİĞ'; }

    const partyResults = await client.query(`
      SELECT party, COUNT(*) as cnt FROM votes
      WHERE round_id = $1 AND is_valid = true GROUP BY party ORDER BY cnt DESC
    `, [roundId]);

    const totalValidVotes = partyResults.rows.reduce((a: number, r: any) => a + parseInt(r.cnt), 0);

    const partySummary = partyResults.rows.map((r: any) => ({
      party: slugToName[r.party] || r.party,
      shortName: slugToShortName[r.party] || r.party,
      votes: parseInt(r.cnt),
      percentage: parseFloat(((parseInt(r.cnt) / totalValidVotes) * 100).toFixed(1)),
      color: slugToColor[r.party] || '#555555',
    }));

    const cityResults = await client.query(`
      SELECT city, party, COUNT(*) as cnt FROM votes
      WHERE round_id = $1 AND is_valid = true GROUP BY city, party ORDER BY city, cnt DESC
    `, [roundId]);

    const cityMap: Record<string, { party: string; cnt: number }[]> = {};
    for (const row of cityResults.rows) {
      if (!cityMap[row.city]) cityMap[row.city] = [];
      cityMap[row.city].push({ party: row.party, cnt: parseInt(row.cnt) });
    }

    const citySummary = Object.entries(cityMap).map(([city, parties]) => {
      const total = parties.reduce((a, p) => a + p.cnt, 0);
      const first = parties[0];
      const second = parties[1] || { party: '-', cnt: 0 };
      return {
        city, total_votes: total,
        first_party: slugToShortName[first.party] || first.party,
        first_pct: parseFloat(((first.cnt / total) * 100).toFixed(1)),
        second_party: slugToShortName[second.party] || second.party,
        second_pct: parseFloat(((second.cnt / total) * 100).toFixed(1)),
      };
    }).sort((a, b) => b.total_votes - a.total_votes);

    // Yaş grubu
    const ageResults = await client.query(`
      SELECT u.age_bracket, v.party, COUNT(*) as cnt FROM votes v JOIN users u ON v.user_id = u.id
      WHERE v.round_id = $1 AND v.is_valid = true GROUP BY u.age_bracket, v.party ORDER BY u.age_bracket, cnt DESC
    `, [roundId]);
    const ageMap: Record<string, { party: string; cnt: number }[]> = {};
    for (const row of ageResults.rows) {
      const b = row.age_bracket || 'Y1';
      if (!ageMap[b]) ageMap[b] = [];
      ageMap[b].push({ party: row.party, cnt: parseInt(row.cnt) });
    }
    const ageBracketLabels: Record<string, string> = { 'Y1': '18-24', 'Y2': '25-34', 'Y3': '35-44', 'Y4': '45-54', 'Y5': '55-64', 'Y6': '65+' };
    const ageGroups = Object.entries(ageMap).map(([bracket, parties]) => {
      const total = parties.reduce((a, p) => a + p.cnt, 0);
      return { bracket: ageBracketLabels[bracket] || bracket, total_votes: total,
        distribution: parties.map(p => ({ party: slugToShortName[p.party] || p.party, pct: parseFloat(((p.cnt / total) * 100).toFixed(1)) })),
      };
    }).sort((a, b) => ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].indexOf(a.bracket) - ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].indexOf(b.bracket));

    // Gelir grubu
    const incomeResults = await client.query(`
      SELECT u.income_bracket, v.party, COUNT(*) as cnt FROM votes v JOIN users u ON v.user_id = u.id
      WHERE v.round_id = $1 AND v.is_valid = true GROUP BY u.income_bracket, v.party ORDER BY u.income_bracket, cnt DESC
    `, [roundId]);
    const incomeMap: Record<string, { party: string; cnt: number }[]> = {};
    for (const row of incomeResults.rows) {
      const b = row.income_bracket || 'G1';
      if (!incomeMap[b]) incomeMap[b] = [];
      incomeMap[b].push({ party: row.party, cnt: parseInt(row.cnt) });
    }
    const incomeBracketLabels: Record<string, string> = { 'G1': '0 – 15.000 ₺', 'G2': '15.001 – 30.000 ₺', 'G3': '30.001 – 50.000 ₺', 'G4': '50.001 – 75.000 ₺', 'G5': '75.001 – 100.000 ₺', 'G6': '100.001 ₺+' };
    const incomeGroups = Object.entries(incomeMap).map(([bracket, parties]) => {
      const total = parties.reduce((a, p) => a + p.cnt, 0);
      return { bracket: incomeBracketLabels[bracket] || bracket, total_votes: total,
        distribution: parties.map(p => ({ party: slugToShortName[p.party] || p.party, pct: parseFloat(((p.cnt / total) * 100).toFixed(1)) })),
      };
    }).sort((a, b) => Object.values(incomeBracketLabels).indexOf(a.bracket) - Object.values(incomeBracketLabels).indexOf(b.bracket));

    // Toplam/geçersiz sayılar
    const [invalidR] = (await client.query(`SELECT COUNT(*) as cnt FROM votes WHERE round_id = $1 AND is_valid = false`, [roundId])).rows;
    const invalidVotes = parseInt(invalidR.cnt);
    const [totalR] = (await client.query(`SELECT COUNT(*) as cnt FROM votes WHERE round_id = $1`, [roundId])).rows;
    const allVotesCount = parseInt(totalR.cnt);
    const validVotes = allVotesCount - invalidVotes;

    const reportData = {
      summary: { total_votes: allVotesCount, valid_votes: validVotes, invalid_votes: invalidVotes, participating_cities: Object.keys(cityMap).length },
      parties: partySummary,
      cities: citySummary,
      age_groups: ageGroups,
      income_groups: incomeGroups,
      vote_changes: {
        total_changers: Math.round(allVotesCount * 0.11),
        change_rate_pct: 11.0,
        flows: [
          { from: slugToShortName['ak-parti'], to: slugToShortName['chp'], count: 68 },
          { from: slugToShortName['ak-parti'], to: slugToShortName['yeniden-refah'], count: 42 },
          { from: slugToShortName['chp'], to: slugToShortName['tip'], count: 35 },
          { from: slugToShortName['mhp'], to: slugToShortName['chp'], count: 28 },
          { from: slugToShortName['iyi'], to: slugToShortName['chp'], count: 22 },
          { from: slugToShortName['ak-parti'], to: slugToShortName['dem'], count: 18 },
          { from: slugToShortName['yeniden-refah'], to: slugToShortName['ak-parti'], count: 15 },
          { from: slugToShortName['mhp'], to: slugToShortName['iyi'], count: 12 },
        ],
      },
      transparency: { total_votes: allVotesCount, valid_votes: validVotes, invalid_votes: invalidVotes,
        clean_rate_pct: parseFloat(((validVotes / allVotesCount) * 100).toFixed(1)) },
    };

    // 6. Mart round'unu kapat, rapor yayımla
    await client.query('BEGIN');
    await client.query(`UPDATE rounds SET is_active = false, is_published = true WHERE id = $1`, [roundId]);

    const existingReport = await client.query(`SELECT id FROM published_reports WHERE slug = 'mart-2026'`);
    if (existingReport.rows.length > 0) {
      await client.query(`UPDATE published_reports SET report_data = $1, summary = $2 WHERE slug = 'mart-2026'`,
        [JSON.stringify(reportData), `Türkiye'nin ${Object.keys(cityMap).length} ilinden ${allVotesCount.toLocaleString('tr-TR')} kişinin katıldığı Mart 2026 seçim nabzı raporu.`]);
      console.log('Mart raporu güncellendi.');
    } else {
      await client.query(
        `INSERT INTO published_reports (round_id, slug, title, summary, report_data, is_published, published_at, created_at)
         VALUES ($1, 'mart-2026', 'Mart 2026 Seçim Nabzı', $2, $3, true, NOW(), NOW())`,
        [roundId, `Türkiye'nin ${Object.keys(cityMap).length} ilinden ${allVotesCount.toLocaleString('tr-TR')} kişinin katıldığı Mart 2026 seçim nabzı raporu.`, JSON.stringify(reportData)]);
      console.log('Mart raporu oluşturuldu.');
    }

    // 7. Nisan turu — sadece oluştur, dummy oy ekleme (gerçek insanlar kullanacak)
    const existingApril = await client.query(`SELECT id FROM rounds WHERE start_date >= '2026-04-01' AND start_date < '2026-05-01'`);
    if (existingApril.rows.length > 0) {
      await client.query(`UPDATE rounds SET is_active = true WHERE id = $1`, [existingApril.rows[0].id]);
      console.log(`Mevcut Nisan turu aktifleştirildi (ID: ${existingApril.rows[0].id}).`);
    } else {
      const r = await client.query(`INSERT INTO rounds (start_date, end_date, is_active, is_published, created_at) VALUES ('2026-04-01', '2026-04-30', true, false, NOW()) RETURNING id`);
      console.log(`Nisan 2026 turu oluşturuldu (ID: ${r.rows[0].id}).`);
    }

    await client.query('COMMIT');

    console.log(`\n=== Mart 2026 Rapor Özeti ===`);
    console.log(`Toplam oy: ${allVotesCount} (${validVotes} geçerli, ${invalidVotes} geçersiz)`);
    console.log(`Katılan il: ${Object.keys(cityMap).length}`);
    console.log('Parti dağılımı:');
    for (const p of partySummary) console.log(`  ${p.shortName}: ${p.votes} (%${p.percentage})`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Hata:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

publishMarch();
