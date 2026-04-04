import 'dotenv/config';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Türkiye'nin 81 ili ve ilçeleri (Türkçe karakterlerle)
const CITY_DISTRICTS: Record<string, string[]> = {
  'İstanbul': ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Ataşehir', 'Maltepe', 'Kartal', 'Pendik', 'Bakırköy', 'Beyoğlu', 'Şişli', 'Fatih', 'Sarıyer', 'Beykoz', 'Başakşehir', 'Esenyurt', 'Bağcılar', 'Bahçelievler', 'Esenler', 'Sultanbeyli', 'Tuzla'],
  'Ankara': ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Etimesgut', 'Sincan', 'Altındağ', 'Pursaklar', 'Gölbaşı', 'Polatlı'],
  'İzmir': ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Bayraklı', 'Çiğli', 'Gaziemir', 'Balçova', 'Karabağlar', 'Narlıdere'],
  'Bursa': ['Osmangazi', 'Nilüfer', 'Yıldırım', 'İnegöl', 'Gemlik', 'Mudanya', 'Gürsu', 'Kestel'],
  'Antalya': ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Alanya', 'Manavgat', 'Serik', 'Kumluca', 'Kaş'],
  'Konya': ['Selçuklu', 'Meram', 'Karatay', 'Ereğli', 'Akşehir', 'Beyşehir', 'Çumra'],
  'Adana': ['Seyhan', 'Çukurova', 'Yüreğir', 'Sarıçam', 'Ceyhan', 'Kozan', 'İmamoğlu'],
  'Gaziantep': ['Şahinbey', 'Şehitkamil', 'Nizip', 'İslahiye', 'Nurdağı', 'Oğuzeli'],
  'Diyarbakır': ['Bağlar', 'Kayapınar', 'Yenişehir', 'Sur', 'Bismil', 'Ergani', 'Silvan'],
  'Mersin': ['Yenişehir', 'Mezitli', 'Akdeniz', 'Toroslar', 'Tarsus', 'Erdemli', 'Silifke'],
  'Kayseri': ['Melikgazi', 'Kocasinan', 'Talas', 'İncesu', 'Develi'],
  'Eskişehir': ['Odunpazarı', 'Tepebaşı', 'Çifteler', 'Sivrihisar'],
  'Samsun': ['İlkadım', 'Atakum', 'Canik', 'Tekkeköy', 'Bafra', 'Çarşamba'],
  'Denizli': ['Merkezefendi', 'Pamukkale', 'Çivril', 'Acıpayam', 'Buldan'],
  'Şanlıurfa': ['Eyyübiye', 'Haliliye', 'Karaköprü', 'Viranşehir', 'Siverek', 'Suruç'],
  'Trabzon': ['Ortahisar', 'Akçaabat', 'Yomra', 'Araklı', 'Of', 'Sürmene'],
  'Kocaeli': ['İzmit', 'Gebze', 'Darıca', 'Çayırova', 'Derince', 'Gölcük', 'Kartepe'],
  'Manisa': ['Yunusemre', 'Şehzadeler', 'Turgutlu', 'Akhisar', 'Salihli', 'Soma'],
  'Malatya': ['Battalgazi', 'Yeşilyurt', 'Doğanşehir', 'Akçadağ', 'Darende'],
  'Balıkesir': ['Altıeylül', 'Karesi', 'Bandırma', 'Edremit', 'Gönen', 'Erdek'],
  'Tekirdağ': ['Süleymanpaşa', 'Çorlu', 'Çerkezköy', 'Ergene', 'Malkara', 'Muratlı'],
  'Van': ['İpekyolu', 'Tuşba', 'Edremit', 'Erciş', 'Çaldıran', 'Özalp'],
  'Erzurum': ['Yakutiye', 'Palandöken', 'Aziziye', 'Oltu', 'Horasan', 'Pasinler'],
  'Hatay': ['Antakya', 'İskenderun', 'Defne', 'Samandağ', 'Dörtyol', 'Reyhanlı'],
  'Muğla': ['Menteşe', 'Bodrum', 'Fethiye', 'Marmaris', 'Milas', 'Dalaman', 'Datça'],
  'Sakarya': ['Adapazarı', 'Serdivan', 'Erenler', 'Akyazı', 'Hendek', 'Sapanca'],
  'Kahramanmaraş': ['Onikişubat', 'Dulkadiroğlu', 'Elbistan', 'Afşin', 'Türkoğlu'],
  'Mardin': ['Artuklu', 'Kızıltepe', 'Nusaybin', 'Midyat', 'Derik', 'Savur'],
  'Aydın': ['Efeler', 'Nazilli', 'Söke', 'Kuşadası', 'Didim', 'İncirliova'],
  'Ordu': ['Altınordu', 'Ünye', 'Fatsa', 'Perşembe', 'Kumru'],
  'Elazığ': ['Merkez', 'Kovancılar', 'Karakoçan', 'Palu', 'Baskil'],
  'Afyonkarahisar': ['Merkez', 'Sandıklı', 'Dinar', 'Bolvadin', 'Emirdağ'],
  'Tokat': ['Merkez', 'Erbaa', 'Turhal', 'Niksar', 'Zile'],
  'Sivas': ['Merkez', 'Şarkışla', 'Suşehri', 'Zara', 'Kangal'],
  'Bolu': ['Merkez', 'Gerede', 'Mudurnu', 'Göynük'],
  'Isparta': ['Merkez', 'Yalvaç', 'Eğirdir', 'Şarkikaraağaç'],
  'Edirne': ['Merkez', 'Keşan', 'Uzunköprü', 'İpsala'],
  'Rize': ['Merkez', 'Çamlıhemşin', 'Ardeşen', 'Pazar', 'Çayeli'],
  'Zonguldak': ['Merkez', 'Ereğli', 'Çaycuma', 'Devrek', 'Alaplı'],
  'Kütahya': ['Merkez', 'Tavşanlı', 'Simav', 'Gediz', 'Emet'],
  'Giresun': ['Merkez', 'Bulancak', 'Görele', 'Espiye', 'Tirebolu'],
  'Aksaray': ['Merkez', 'Ortaköy', 'Eskil', 'Güzelyurt'],
  'Yozgat': ['Merkez', 'Sorgun', 'Boğazlıyan', 'Akdağmadeni'],
  'Kastamonu': ['Merkez', 'Tosya', 'Taşköprü', 'İnebolu', 'Cide'],
  'Düzce': ['Merkez', 'Akçakoca', 'Gölyaka', 'Cumayeri'],
  'Nevşehir': ['Merkez', 'Ürgüp', 'Avanos', 'Gülşehir', 'Kozaklı'],
  'Çorum': ['Merkez', 'Sungurlu', 'Osmancık', 'Alaca', 'İskilip'],
  'Uşak': ['Merkez', 'Banaz', 'Eşme', 'Sivaslı'],
  'Niğde': ['Merkez', 'Bor', 'Çamardı', 'Ulukışla'],
  'Amasya': ['Merkez', 'Merzifon', 'Suluova', 'Taşova', 'Göynücek'],
  'Kırıkkale': ['Merkez', 'Keskin', 'Delice', 'Yahşihan'],
  'Kırşehir': ['Merkez', 'Kaman', 'Mucur', 'Çiçekdağı'],
  'Osmaniye': ['Merkez', 'Kadirli', 'Düziçi', 'Bahçe', 'Hasanbeyli'],
  'Sinop': ['Merkez', 'Boyabat', 'Gerze', 'Ayancık', 'Durağan'],
  'Çankırı': ['Merkez', 'Çerkeş', 'Ilgaz', 'Şabanözü'],
  'Karaman': ['Merkez', 'Ermenek', 'Sarıveliler', 'Ayrancı'],
  'Burdur': ['Merkez', 'Bucak', 'Gölhisar', 'Yeşilova'],
  'Karabük': ['Merkez', 'Safranbolu', 'Eskipazar', 'Yenice'],
  'Kilis': ['Merkez', 'Musabeyli', 'Elbeyli', 'Polateli'],
  'Bilecik': ['Merkez', 'Bozüyük', 'Osmaneli', 'Söğüt'],
  'Bartın': ['Merkez', 'Ulus', 'Kurucaşile', 'Amasra'],
  'Adıyaman': ['Merkez', 'Kahta', 'Besni', 'Gölbaşı', 'Gerger'],
  'Ağrı': ['Merkez', 'Doğubayazıt', 'Patnos', 'Diyadin', 'Eleşkirt'],
  'Muş': ['Merkez', 'Bulanık', 'Malazgirt', 'Varto', 'Hasköy'],
  'Bitlis': ['Merkez', 'Tatvan', 'Ahlat', 'Güroymak', 'Adilcevaz'],
  'Siirt': ['Merkez', 'Kurtalan', 'Baykan', 'Pervari', 'Eruh'],
  'Batman': ['Merkez', 'Sason', 'Kozluk', 'Beşiri', 'Gercüş'],
  'Şırnak': ['Merkez', 'Cizre', 'Silopi', 'İdil', 'Uludere'],
  'Hakkâri': ['Merkez', 'Yüksekova', 'Çukurca', 'Şemdinli'],
  'Iğdır': ['Merkez', 'Tuzluca', 'Aralık', 'Karakoyunlu'],
  'Ardahan': ['Merkez', 'Göle', 'Çıldır', 'Hanak', 'Posof'],
  'Kars': ['Merkez', 'Sarıkamış', 'Kağızman', 'Selim', 'Susuz'],
  'Tunceli': ['Merkez', 'Pertek', 'Hozat', 'Çemişgezek', 'Ovacık'],
  'Bingöl': ['Merkez', 'Genç', 'Solhan', 'Karlıova', 'Adaklı'],
  'Erzincan': ['Merkez', 'Üzümlü', 'Tercan', 'Refahiye', 'Çayırlı'],
  'Bayburt': ['Merkez', 'Demirözü', 'Aydıntepe'],
  'Gümüşhane': ['Merkez', 'Kelkit', 'Şiran', 'Torul', 'Kürtün'],
  'Artvin': ['Merkez', 'Hopa', 'Borçka', 'Arhavi', 'Şavşat'],
  'Yalova': ['Merkez', 'Çınarcık', 'Altınova', 'Armutlu', 'Termal'],
  'Çanakkale': ['Merkez', 'Biga', 'Çan', 'Gelibolu', 'Lapseki', 'Ayvacık'],
  'Kırklareli': ['Merkez', 'Lüleburgaz', 'Babaeski', 'Vize', 'Pınarhisar'],
};

// İl bazlı oy dağılımı (gerçekçi nüfus oranlarına yakın)
const CITY_VOTE_WEIGHTS: Record<string, number> = {
  'İstanbul': 200, 'Ankara': 95, 'İzmir': 80, 'Bursa': 50, 'Antalya': 45,
  'Konya': 40, 'Adana': 38, 'Gaziantep': 36, 'Diyarbakır': 32, 'Mersin': 30,
  'Kayseri': 25, 'Eskişehir': 22, 'Samsun': 20, 'Denizli': 18, 'Şanlıurfa': 28,
  'Trabzon': 16, 'Kocaeli': 30, 'Manisa': 18, 'Malatya': 14, 'Balıkesir': 16,
  'Tekirdağ': 16, 'Van': 18, 'Erzurum': 14, 'Hatay': 22, 'Muğla': 15,
  'Sakarya': 16, 'Kahramanmaraş': 14, 'Mardin': 12, 'Aydın': 15, 'Ordu': 10,
  'Elazığ': 10, 'Afyonkarahisar': 8, 'Tokat': 8, 'Sivas': 8, 'Bolu': 6,
  'Isparta': 6, 'Edirne': 6, 'Rize': 6, 'Zonguldak': 8, 'Kütahya': 6,
  'Giresun': 6, 'Aksaray': 6, 'Yozgat': 5, 'Kastamonu': 5, 'Düzce': 5,
  'Nevşehir': 4, 'Çorum': 6, 'Uşak': 4, 'Niğde': 4, 'Amasya': 4,
  'Kırıkkale': 4, 'Kırşehir': 3, 'Osmaniye': 6, 'Sinop': 3, 'Çankırı': 3,
  'Karaman': 3, 'Burdur': 3, 'Karabük': 3, 'Kilis': 2, 'Bilecik': 3,
  'Bartın': 3, 'Adıyaman': 8, 'Ağrı': 6, 'Muş': 5, 'Bitlis': 4,
  'Siirt': 4, 'Batman': 6, 'Şırnak': 5, 'Hakkâri': 3, 'Iğdır': 3,
  'Ardahan': 2, 'Kars': 4, 'Tunceli': 2, 'Bingöl': 4, 'Erzincan': 3,
  'Bayburt': 2, 'Gümüşhane': 2, 'Artvin': 3, 'Yalova': 4, 'Çanakkale': 5,
  'Kırklareli': 4,
};

// İl bazlı parti eğilimleri — 2024 yerel seçim sonuçlarına yakın
const CITY_PARTY_TENDENCY: Record<string, Record<string, number>> = {
  // CHP kazandığı iller (35 il)
  'İstanbul': { 'chp':48, 'ak-parti':22, 'mhp':5, 'iyi':5, 'dem':10, 'yeniden-refah':4, 'tip':3, 'diger':3 },
  'Ankara': { 'chp':52, 'ak-parti':22, 'mhp':6, 'iyi':6, 'dem':3, 'yeniden-refah':5, 'tip':3, 'diger':3 },
  'İzmir': { 'chp':55, 'ak-parti':14, 'mhp':5, 'iyi':8, 'dem':4, 'yeniden-refah':3, 'tip':7, 'diger':4 },
  'Antalya': { 'chp':50, 'ak-parti':22, 'mhp':7, 'iyi':7, 'dem':2, 'yeniden-refah':5, 'tip':4, 'diger':3 },
  'Bursa': { 'chp':44, 'ak-parti':28, 'mhp':7, 'iyi':5, 'dem':4, 'yeniden-refah':6, 'tip':3, 'diger':3 },
  'Adana': { 'chp':46, 'ak-parti':24, 'mhp':8, 'iyi':5, 'dem':5, 'yeniden-refah':5, 'tip':4, 'diger':3 },
  'Mersin': { 'chp':45, 'ak-parti':22, 'mhp':8, 'iyi':6, 'dem':6, 'yeniden-refah':5, 'tip':5, 'diger':3 },
  'Muğla': { 'chp':55, 'ak-parti':15, 'mhp':6, 'iyi':8, 'dem':2, 'yeniden-refah':3, 'tip':6, 'diger':5 },
  'Aydın': { 'chp':52, 'ak-parti':18, 'mhp':7, 'iyi':7, 'dem':3, 'yeniden-refah':4, 'tip':5, 'diger':4 },
  'Tekirdağ': { 'chp':50, 'ak-parti':20, 'mhp':7, 'iyi':6, 'dem':4, 'yeniden-refah':5, 'tip':4, 'diger':4 },
  'Eskişehir': { 'chp':52, 'ak-parti':20, 'mhp':6, 'iyi':7, 'dem':3, 'yeniden-refah':4, 'tip':5, 'diger':3 },
  'Denizli': { 'chp':46, 'ak-parti':24, 'mhp':8, 'iyi':7, 'dem':2, 'yeniden-refah':5, 'tip':4, 'diger':4 },
  'Balıkesir': { 'chp':45, 'ak-parti':24, 'mhp':8, 'iyi':7, 'dem':2, 'yeniden-refah':6, 'tip':4, 'diger':4 },
  'Manisa': { 'chp':44, 'ak-parti':25, 'mhp':9, 'iyi':6, 'dem':2, 'yeniden-refah':6, 'tip':4, 'diger':4 },
  'Çanakkale': { 'chp':52, 'ak-parti':18, 'mhp':7, 'iyi':8, 'dem':2, 'yeniden-refah':4, 'tip':5, 'diger':4 },
  'Edirne': { 'chp':60, 'ak-parti':14, 'mhp':6, 'iyi':7, 'dem':2, 'yeniden-refah':3, 'tip':4, 'diger':4 },
  'Hatay': { 'chp':42, 'ak-parti':24, 'mhp':10, 'iyi':6, 'dem':5, 'yeniden-refah':6, 'tip':4, 'diger':3 },
  'Bolu': { 'chp':42, 'ak-parti':28, 'mhp':8, 'iyi':6, 'dem':2, 'yeniden-refah':7, 'tip':3, 'diger':4 },
  'Bilecik': { 'chp':44, 'ak-parti':26, 'mhp':8, 'iyi':7, 'dem':2, 'yeniden-refah':5, 'tip':4, 'diger':4 },
  'Uşak': { 'chp':45, 'ak-parti':24, 'mhp':8, 'iyi':7, 'dem':2, 'yeniden-refah':6, 'tip':4, 'diger':4 },
  'Kütahya': { 'chp':40, 'ak-parti':28, 'mhp':9, 'iyi':6, 'dem':2, 'yeniden-refah':7, 'tip':3, 'diger':5 },
  'Isparta': { 'chp':40, 'ak-parti':28, 'mhp':9, 'iyi':6, 'dem':2, 'yeniden-refah':7, 'tip':3, 'diger':5 },
  'Burdur': { 'chp':42, 'ak-parti':26, 'mhp':9, 'iyi':6, 'dem':2, 'yeniden-refah':7, 'tip':3, 'diger':5 },
  'Kocaeli': { 'chp':42, 'ak-parti':26, 'mhp':8, 'iyi':6, 'dem':5, 'yeniden-refah':6, 'tip':3, 'diger':4 },
  'Sakarya': { 'chp':40, 'ak-parti':28, 'mhp':8, 'iyi':6, 'dem':3, 'yeniden-refah':7, 'tip':3, 'diger':5 },
  'Zonguldak': { 'chp':44, 'ak-parti':24, 'mhp':8, 'iyi':6, 'dem':2, 'yeniden-refah':6, 'tip':5, 'diger':5 },
  'Bartın': { 'chp':42, 'ak-parti':26, 'mhp':9, 'iyi':6, 'dem':2, 'yeniden-refah':7, 'tip':3, 'diger':5 },
  'Düzce': { 'chp':38, 'ak-parti':30, 'mhp':8, 'iyi':6, 'dem':3, 'yeniden-refah':7, 'tip':3, 'diger':5 },
  'Yalova': { 'chp':48, 'ak-parti':22, 'mhp':7, 'iyi':7, 'dem':4, 'yeniden-refah':5, 'tip':4, 'diger':3 },
  'Sinop': { 'chp':48, 'ak-parti':22, 'mhp':8, 'iyi':6, 'dem':2, 'yeniden-refah':5, 'tip':5, 'diger':4 },
  'Amasya': { 'chp':42, 'ak-parti':26, 'mhp':9, 'iyi':6, 'dem':2, 'yeniden-refah':7, 'tip':4, 'diger':4 },
  'Çorum': { 'chp':40, 'ak-parti':28, 'mhp':9, 'iyi':6, 'dem':2, 'yeniden-refah':7, 'tip':3, 'diger':5 },
  'Tunceli': { 'chp':30, 'ak-parti':5, 'mhp':2, 'iyi':3, 'dem':18, 'yeniden-refah':1, 'tip':35, 'diger':6 },
  'Karabük': { 'chp':42, 'ak-parti':26, 'mhp':9, 'iyi':6, 'dem':2, 'yeniden-refah':7, 'tip':3, 'diger':5 },
  'Kastamonu': { 'chp':42, 'ak-parti':26, 'mhp':9, 'iyi':6, 'dem':2, 'yeniden-refah':7, 'tip':3, 'diger':5 },

  // AKP kazandığı iller (24 il)
  'Konya': { 'chp':18, 'ak-parti':48, 'mhp':10, 'iyi':4, 'dem':2, 'yeniden-refah':12, 'tip':2, 'diger':4 },
  'Gaziantep': { 'chp':22, 'ak-parti':42, 'mhp':10, 'iyi':4, 'dem':8, 'yeniden-refah':8, 'tip':2, 'diger':4 },
  'Şanlıurfa': { 'chp':12, 'ak-parti':40, 'mhp':5, 'iyi':3, 'dem':28, 'yeniden-refah':6, 'tip':2, 'diger':4 },
  'Kayseri': { 'chp':22, 'ak-parti':40, 'mhp':10, 'iyi':5, 'dem':3, 'yeniden-refah':12, 'tip':2, 'diger':6 },
  'Trabzon': { 'chp':18, 'ak-parti':42, 'mhp':12, 'iyi':5, 'dem':2, 'yeniden-refah':12, 'tip':2, 'diger':5 },
  'Samsun': { 'chp':28, 'ak-parti':36, 'mhp':10, 'iyi':6, 'dem':3, 'yeniden-refah':8, 'tip':3, 'diger':6 },
  'Malatya': { 'chp':18, 'ak-parti':38, 'mhp':12, 'iyi':4, 'dem':8, 'yeniden-refah':12, 'tip':3, 'diger':5 },
  'Kahramanmaraş': { 'chp':16, 'ak-parti':40, 'mhp':12, 'iyi':4, 'dem':5, 'yeniden-refah':14, 'tip':2, 'diger':7 },
  'Elazığ': { 'chp':16, 'ak-parti':40, 'mhp':14, 'iyi':4, 'dem':10, 'yeniden-refah':8, 'tip':3, 'diger':5 },
  'Rize': { 'chp':14, 'ak-parti':48, 'mhp':10, 'iyi':5, 'dem':2, 'yeniden-refah':12, 'tip':2, 'diger':7 },
  'Erzurum': { 'chp':12, 'ak-parti':40, 'mhp':14, 'iyi':4, 'dem':10, 'yeniden-refah':12, 'tip':2, 'diger':6 },
  'Aksaray': { 'chp':18, 'ak-parti':44, 'mhp':10, 'iyi':5, 'dem':2, 'yeniden-refah':12, 'tip':2, 'diger':7 },
  'Yozgat': { 'chp':22, 'ak-parti':38, 'mhp':12, 'iyi':5, 'dem':3, 'yeniden-refah':10, 'tip':3, 'diger':7 },
  'Niğde': { 'chp':22, 'ak-parti':38, 'mhp':12, 'iyi':5, 'dem':2, 'yeniden-refah':12, 'tip':2, 'diger':7 },
  'Nevşehir': { 'chp':22, 'ak-parti':38, 'mhp':12, 'iyi':5, 'dem':2, 'yeniden-refah':12, 'tip':2, 'diger':7 },
  'Karaman': { 'chp':20, 'ak-parti':42, 'mhp':10, 'iyi':5, 'dem':2, 'yeniden-refah':12, 'tip':2, 'diger':7 },
  'Afyonkarahisar': { 'chp':28, 'ak-parti':35, 'mhp':10, 'iyi':6, 'dem':2, 'yeniden-refah':10, 'tip':3, 'diger':6 },
  'Giresun': { 'chp':24, 'ak-parti':38, 'mhp':10, 'iyi':5, 'dem':2, 'yeniden-refah':12, 'tip':3, 'diger':6 },
  'Ordu': { 'chp':26, 'ak-parti':36, 'mhp':10, 'iyi':6, 'dem':2, 'yeniden-refah':10, 'tip':4, 'diger':6 },
  'Tokat': { 'chp':28, 'ak-parti':34, 'mhp':10, 'iyi':6, 'dem':3, 'yeniden-refah':10, 'tip':3, 'diger':6 },
  'Adıyaman': { 'chp':14, 'ak-parti':38, 'mhp':8, 'iyi':3, 'dem':18, 'yeniden-refah':10, 'tip':3, 'diger':6 },
  'Bayburt': { 'chp':10, 'ak-parti':48, 'mhp':14, 'iyi':4, 'dem':2, 'yeniden-refah':14, 'tip':2, 'diger':6 },
  'Gümüşhane': { 'chp':12, 'ak-parti':45, 'mhp':14, 'iyi':5, 'dem':2, 'yeniden-refah':12, 'tip':2, 'diger':8 },
  'Osmaniye': { 'chp':30, 'ak-parti':32, 'mhp':12, 'iyi':5, 'dem':3, 'yeniden-refah':8, 'tip':3, 'diger':7 },

  // DEM kazandığı iller (10 il)
  'Diyarbakır': { 'chp':6, 'ak-parti':14, 'mhp':2, 'iyi':1, 'dem':65, 'yeniden-refah':4, 'tip':5, 'diger':3 },
  'Van': { 'chp':5, 'ak-parti':18, 'mhp':3, 'iyi':1, 'dem':62, 'yeniden-refah':4, 'tip':3, 'diger':4 },
  'Mardin': { 'chp':5, 'ak-parti':15, 'mhp':2, 'iyi':1, 'dem':65, 'yeniden-refah':4, 'tip':4, 'diger':4 },
  'Batman': { 'chp':4, 'ak-parti':18, 'mhp':2, 'iyi':1, 'dem':62, 'yeniden-refah':5, 'tip':4, 'diger':4 },
  'Şırnak': { 'chp':3, 'ak-parti':10, 'mhp':2, 'iyi':1, 'dem':72, 'yeniden-refah':3, 'tip':5, 'diger':4 },
  'Hakkâri': { 'chp':3, 'ak-parti':7, 'mhp':1, 'iyi':1, 'dem':78, 'yeniden-refah':2, 'tip':5, 'diger':3 },
  'Ağrı': { 'chp':5, 'ak-parti':22, 'mhp':3, 'iyi':2, 'dem':56, 'yeniden-refah':4, 'tip':4, 'diger':4 },
  'Muş': { 'chp':4, 'ak-parti':18, 'mhp':3, 'iyi':1, 'dem':62, 'yeniden-refah':4, 'tip':4, 'diger':4 },
  'Bitlis': { 'chp':5, 'ak-parti':22, 'mhp':3, 'iyi':2, 'dem':55, 'yeniden-refah':5, 'tip':4, 'diger':4 },
  'Siirt': { 'chp':4, 'ak-parti':22, 'mhp':3, 'iyi':1, 'dem':58, 'yeniden-refah':4, 'tip':4, 'diger':4 },

  // MHP kazandığı iller (8 il) — haritada mavi
  'Artvin': { 'chp':28, 'ak-parti':22, 'mhp':32, 'iyi':5, 'dem':2, 'yeniden-refah':4, 'tip':3, 'diger':4 },
  'Ardahan': { 'chp':22, 'ak-parti':20, 'mhp':35, 'iyi':5, 'dem':6, 'yeniden-refah':4, 'tip':3, 'diger':5 },
  'Kars': { 'chp':18, 'ak-parti':22, 'mhp':30, 'iyi':5, 'dem':12, 'yeniden-refah':5, 'tip':3, 'diger':5 },
  'Iğdır': { 'chp':10, 'ak-parti':20, 'mhp':35, 'iyi':4, 'dem':18, 'yeniden-refah':5, 'tip':3, 'diger':5 },
  'Erzincan': { 'chp':25, 'ak-parti':24, 'mhp':30, 'iyi':5, 'dem':4, 'yeniden-refah':5, 'tip':3, 'diger':4 },
  'Bingöl': { 'chp':8, 'ak-parti':28, 'mhp':30, 'iyi':3, 'dem':18, 'yeniden-refah':6, 'tip':3, 'diger':4 },
  'Sivas': { 'chp':22, 'ak-parti':28, 'mhp':28, 'iyi':5, 'dem':3, 'yeniden-refah':6, 'tip':3, 'diger':5 },
  'Çankırı': { 'chp':24, 'ak-parti':26, 'mhp':28, 'iyi':6, 'dem':2, 'yeniden-refah':6, 'tip':3, 'diger':5 },

  // YRP kazandığı iller (2 il) — haritada gri
  'Kırıkkale': { 'chp':22, 'ak-parti':22, 'mhp':10, 'iyi':5, 'dem':2, 'yeniden-refah':30, 'tip':3, 'diger':6 },
  'Kırşehir': { 'chp':24, 'ak-parti':20, 'mhp':10, 'iyi':6, 'dem':2, 'yeniden-refah':28, 'tip':4, 'diger':6 },

  // İYİ kazandığı il (1 il)
  'Kırklareli': { 'chp':30, 'ak-parti':12, 'mhp':8, 'iyi':32, 'dem':2, 'yeniden-refah':5, 'tip':5, 'diger':6 },
};

// Varsayılan parti eğilimi (tanımlanmamış iller için — CHP hafif önde)
const DEFAULT_TENDENCY = { 'chp':36, 'ak-parti':26, 'mhp':10, 'iyi':6, 'dem':4, 'yeniden-refah':8, 'tip':4, 'diger':6 };

const AGE_BRACKETS = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'];
const INCOME_BRACKETS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
const GENDERS = ['E', 'K'];
const EDUCATION_LEVELS = ['E1', 'E2', 'E3', 'E4', 'E5'];
const TURNOUT_OPTIONS = ['T1', 'T2', 'T3', 'T4'];
const PARTY_SLUGS = ['chp', 'ak-parti', 'mhp', 'iyi', 'dem', 'yeniden-refah', 'tip', 'diger'];

// TÜİK 2025 verilerine göre ağırlıklı dağılımlar
const AGE_WEIGHTS = [14.2, 22.8, 20.5, 17.3, 14.1, 11.1]; // Y1-Y6
const GENDER_WEIGHTS = [50.2, 49.8]; // E, K
const EDUCATION_WEIGHTS = [15, 12, 28, 32, 13]; // E1-E5
const TURNOUT_WEIGHTS = [55, 25, 12, 8]; // T1-T4

// Yaş-eğitim korelasyonu: gençlerde üniversite oranı daha yüksek
function pickEducation(ageBracket: string): string {
  if (['Y1', 'Y2'].includes(ageBracket)) {
    return weightedRandom(EDUCATION_LEVELS, [5, 8, 25, 45, 17]);
  } else if (['Y5', 'Y6'].includes(ageBracket)) {
    return weightedRandom(EDUCATION_LEVELS, [30, 18, 28, 18, 6]);
  }
  return weightedRandom(EDUCATION_LEVELS, EDUCATION_WEIGHTS);
}

// 2023 oyu: parti eğilimine göre ama biraz noise ile
function pickPreviousVote2023(currentParty: string): string {
  // %70 aynı partiyi, %15 yakın partiyi, %10 farklı partiyi, %5 "yok"
  const r = Math.random();
  if (r < 0.05) return 'yok';
  if (r < 0.70) return currentParty;
  // Yakın parti geçişleri
  const transitions: Record<string, string[]> = {
    'chp': ['iyi', 'tip', 'dem'],
    'ak-parti': ['mhp', 'yeniden-refah'],
    'mhp': ['ak-parti', 'iyi'],
    'iyi': ['chp', 'mhp'],
    'dem': ['chp', 'tip'],
    'yeniden-refah': ['ak-parti', 'mhp'],
    'tip': ['chp', 'dem'],
    'diger': ['chp', 'ak-parti', 'iyi'],
  };
  if (r < 0.85) {
    const nearby = transitions[currentParty] || PARTY_SLUGS;
    return nearby[Math.floor(Math.random() * nearby.length)];
  }
  return PARTY_SLUGS[Math.floor(Math.random() * PARTY_SLUGS.length)];
}
const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Linux; Android 13; Samsung Galaxy A54) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
];

function randomFingerprint(): string {
  return crypto.randomBytes(16).toString('hex');
}

function randomIP(): string {
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function randomDate(start: Date, end: Date): Date {
  const s = start.getTime();
  const e = end.getTime();
  const t = s + Math.random() * (e - s);
  return new Date(t);
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Yaş ve gelir grubuna göre ağırlıklandırılmış parti seçimi
function pickPartyForCity(city: string, ageBracket: string, incomeBracket: string): string {
  const baseTendency = CITY_PARTY_TENDENCY[city] || DEFAULT_TENDENCY;
  // Kopya oluştur — orijinali değiştirmemek için
  const tendency: Record<string, number> = { ...baseTendency };

  // Yaş bazlı modifiye
  if (['Y4', 'Y5', 'Y6'].includes(ageBracket)) {
    // 45+ yaş: AKP, MHP, YRP güçlenir; CHP, TİP zayıflar
    tendency['ak-parti'] = (tendency['ak-parti'] || 0) * 1.6;
    tendency['mhp'] = (tendency['mhp'] || 0) * 1.3;
    tendency['yeniden-refah'] = (tendency['yeniden-refah'] || 0) * 1.4;
    tendency['chp'] = (tendency['chp'] || 0) * 0.65;
    tendency['tip'] = (tendency['tip'] || 0) * 0.5;
    tendency['dem'] = (tendency['dem'] || 0) * 0.8;
  } else if (['Y1', 'Y2'].includes(ageBracket)) {
    // 18-34 yaş: CHP, TİP, DEM güçlenir; AKP, MHP, YRP zayıflar
    tendency['chp'] = (tendency['chp'] || 0) * 1.4;
    tendency['tip'] = (tendency['tip'] || 0) * 1.6;
    tendency['dem'] = (tendency['dem'] || 0) * 1.2;
    tendency['iyi'] = (tendency['iyi'] || 0) * 1.1;
    tendency['ak-parti'] = (tendency['ak-parti'] || 0) * 0.55;
    tendency['mhp'] = (tendency['mhp'] || 0) * 0.7;
    tendency['yeniden-refah'] = (tendency['yeniden-refah'] || 0) * 0.6;
  }
  // Y3 (35-44) — nötr, baz eğilim kullanılır

  // Gelir bazlı modifiye
  if (['G1', 'G2'].includes(incomeBracket)) {
    // Düşük gelir: AKP, YRP güçlenir; CHP biraz zayıflar
    tendency['ak-parti'] = (tendency['ak-parti'] || 0) * 1.4;
    tendency['yeniden-refah'] = (tendency['yeniden-refah'] || 0) * 1.3;
    tendency['chp'] = (tendency['chp'] || 0) * 0.8;
    tendency['iyi'] = (tendency['iyi'] || 0) * 0.8;
  } else if (['G5', 'G6'].includes(incomeBracket)) {
    // Yüksek gelir: CHP, İYİ güçlenir; AKP, YRP zayıflar
    tendency['chp'] = (tendency['chp'] || 0) * 1.35;
    tendency['iyi'] = (tendency['iyi'] || 0) * 1.3;
    tendency['ak-parti'] = (tendency['ak-parti'] || 0) * 0.6;
    tendency['yeniden-refah'] = (tendency['yeniden-refah'] || 0) * 0.6;
    tendency['mhp'] = (tendency['mhp'] || 0) * 0.8;
  }
  // G3, G4 — nötr

  const parties = Object.keys(tendency);
  const weights = Object.values(tendency);
  return weightedRandom(parties, weights);
}

function pickDistrict(city: string): string {
  const districts = CITY_DISTRICTS[city];
  if (!districts || districts.length === 0) return 'Merkez';
  return districts[Math.floor(Math.random() * districts.length)];
}

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Dummy oy oluşturma başlıyor...');

    // 1. Şubat round'unu SQL ile bul (JS Date timezone sorunlarını önlemek için)
    const febResult = await client.query(
      `SELECT id FROM rounds WHERE start_date >= '2026-02-01' AND start_date < '2026-03-01' LIMIT 1`
    );
    if (febResult.rows.length === 0) {
      console.error('Şubat 2026 round bulunamadı!');
      process.exit(1);
    }
    const roundId = febResult.rows[0].id;
    console.log(`Şubat Round ID: ${roundId}`);

    // Aktif round'u bul
    const activeResult = await client.query(
      `SELECT id, start_date, end_date FROM rounds WHERE is_active = true LIMIT 1`
    );
    const activeRound = activeResult.rows.length > 0 ? activeResult.rows[0] : null;
    if (activeRound && activeRound.id !== roundId) {
      console.log(`Aktif Round ID: ${activeRound.id}`);
    }

    // 2. Mevcut dummy verileri temizle
    await client.query('BEGIN');

    // Eski dummy verileri sil
    await client.query(`DELETE FROM device_logs WHERE user_id IN (SELECT id FROM users WHERE is_dummy = true)`);
    await client.query(`DELETE FROM vote_changes WHERE user_id IN (SELECT id FROM users WHERE is_dummy = true)`);
    await client.query(`DELETE FROM votes WHERE is_dummy = true`);
    await client.query(`DELETE FROM users WHERE is_dummy = true`);

    await client.query('COMMIT');
    console.log('Eski dummy veriler temizlendi.');

    // 3. İl bazlı oy sayılarını hesapla
    const totalWeight = Object.values(CITY_VOTE_WEIGHTS).reduce((a, b) => a + b, 0);
    const cityVoteCounts: Record<string, number> = {};
    let assignedVotes = 0;

    const cities = Object.keys(CITY_VOTE_WEIGHTS);
    for (const city of cities) {
      const count = Math.round((CITY_VOTE_WEIGHTS[city] / totalWeight) * 1591);
      cityVoteCounts[city] = count;
      assignedVotes += count;
    }

    // Fark varsa İstanbul'a ekle/çıkar
    const diff = 1591 - assignedVotes;
    cityVoteCounts['İstanbul'] += diff;

    console.log(`Toplam oy: ${Object.values(cityVoteCounts).reduce((a, b) => a + b, 0)}`);

    // 4. Oyları oluştur — gerçekçi fingerprint collision ile geçersiz oylar
    const febStart = new Date('2026-02-01T06:00:00Z');
    const febEnd = new Date('2026-02-28T22:00:00Z');

    // ~49 geçersiz oy oluşturmak için ~25 paylaşılan fingerprint (her biri 2 hesap)
    const FLAGGED_COUNT = 25;
    const sharedFingerprints: string[] = [];
    for (let i = 0; i < FLAGGED_COUNT; i++) {
      sharedFingerprints.push(randomFingerprint());
    }

    let totalCreated = 0;
    let flaggedVoteCount = 0;
    let flaggedFpIndex = 0;

    // İlleri ve oy sayılarını düzleştir: hangi oyların flagged olacağını belirle
    const flatVotes: { city: string; isFlagged: boolean; sharedFp: string | null }[] = [];
    for (const city of cities) {
      const count = cityVoteCounts[city];
      for (let i = 0; i < count; i++) {
        flatVotes.push({ city, isFlagged: false, sharedFp: null });
      }
    }

    // Rastgele ~50 oyu (25 çift) flagged olarak işaretle
    const indices = Array.from({ length: flatVotes.length }, (_, i) => i);
    // Shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < FLAGGED_COUNT * 2 && i < indices.length; i++) {
      const fpIdx = Math.floor(i / 2);
      flatVotes[indices[i]].isFlagged = true;
      flatVotes[indices[i]].sharedFp = sharedFingerprints[fpIdx];
    }

    await client.query('BEGIN');

    for (const vote of flatVotes) {
      const { city, isFlagged, sharedFp } = vote;
      const ageBracket = weightedRandom(AGE_BRACKETS, AGE_WEIGHTS);
      const incomeBracket = INCOME_BRACKETS[Math.floor(Math.random() * INCOME_BRACKETS.length)];
      const gender = weightedRandom(GENDERS, GENDER_WEIGHTS);
      const education = pickEducation(ageBracket);
      const turnoutIntention = weightedRandom(TURNOUT_OPTIONS, TURNOUT_WEIGHTS);
      const party = pickPartyForCity(city, ageBracket, incomeBracket);
      const previousVote2023 = pickPreviousVote2023(party);
      const district = pickDistrict(city);
      const fingerprint = isFlagged ? sharedFp! : randomFingerprint();
      const ip = randomIP();
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const createdAt = randomDate(febStart, febEnd);
      const username = `0x${crypto.randomBytes(6).toString('hex')}`;
      const email = `dummy_${crypto.randomBytes(8).toString('hex')}@milletneder.local`;
      const referralCode = crypto.randomBytes(4).toString('hex');
      const passwordHash = '$2b$10$dummyHashForSeedDataOnly000000000000000000000000000000';

      // Kullanıcı oluştur (flagged kullanıcılar is_flagged=true)
      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, city, district, age_bracket, income_bracket, gender, education, turnout_intention, previous_vote_2023, referral_code, email_verified, is_flagged, is_active, is_dummy, badges, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, true, true, '[]', $14, $14)
         RETURNING id`,
        [username, email, passwordHash, city, district, ageBracket, incomeBracket, gender, education, turnoutIntention, previousVote2023, referralCode, isFlagged, createdAt]
      );
      const userId = userResult.rows[0].id;

      // Oy oluştur (flagged kullanıcıların oyları is_valid=false)
      await client.query(
        `INSERT INTO votes (user_id, round_id, party, city, district, is_valid, is_dummy, change_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, 0, $7, $7)`,
        [userId, roundId, party, city, district, !isFlagged, createdAt]
      );

      // Device log oluştur (aynı fingerprint ile — güvenlik mekanizması tetikleniyor)
      await client.query(
        `INSERT INTO device_logs (user_id, fingerprint, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, fingerprint, ip, userAgent, createdAt]
      );

      if (isFlagged) flaggedVoteCount++;
      totalCreated++;
      if (totalCreated % 100 === 0) {
        console.log(`${totalCreated} / 1591 oy oluşturuldu...`);
      }
    }

    await client.query('COMMIT');
    console.log(`Toplam ${totalCreated} dummy oy oluşturuldu (${flaggedVoteCount} geçersiz).`);

    // 4b. Aktif round varsa ona da dummy oy ekle (ana sayfa katılım için)
    if (activeRound && activeRound.id !== roundId) {
      console.log(`\nAktif round (${activeRound.id}) için de oy oluşturuluyor...`);
      const activeStart = new Date(activeRound.start_date);
      const activeNow = new Date();
      let activeCreated = 0;

      await client.query('BEGIN');

      // Aktif round için mevcut dummy userları kullan (Şubat'ta oluşturulanlar)
      // Her kullanıcı aktif round'da da oy kullanmış gibi yap
      // Daha az oy — yeni ay daha az katılım
      const activeVoteCount = Math.floor(totalCreated * 0.6); // Şubat'ın %60'ı

      // Dummy kullanıcı ID'lerini al
      const dummyUsersResult = await client.query(
        `SELECT id, city, district, age_bracket, income_bracket FROM users WHERE is_dummy = true AND is_flagged = false ORDER BY RANDOM() LIMIT $1`,
        [activeVoteCount]
      );

      for (const user of dummyUsersResult.rows) {
        const party = pickPartyForCity(user.city, user.age_bracket || 'Y3', user.income_bracket || 'G3');
        const createdAt = randomDate(activeStart, activeNow);

        try {
          await client.query(
            `INSERT INTO votes (user_id, round_id, party, city, district, is_valid, is_dummy, change_count, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, true, true, 0, $6, $6)`,
            [user.id, activeRound.id, party, user.city, user.district, createdAt]
          );
          activeCreated++;
        } catch {
          // Unique constraint violation (user already voted in this round) — skip
        }
      }

      await client.query('COMMIT');
      console.log(`Aktif round için ${activeCreated} dummy oy oluşturuldu.`);
    }

    // 5. İl bazlı sonuçları hesapla (published_reports için) — geçerli oylar
    const cityResults = await client.query(`
      SELECT city, party, COUNT(*) as cnt
      FROM votes
      WHERE round_id = $1 AND is_valid = true
      GROUP BY city, party
      ORDER BY city, cnt DESC
    `, [roundId]);

    // Parti slug → isim eşleştirmesi (DB'den) — citySummary ve partySummary'den ÖNCE tanımlanmalı
    const partyNameResult = await client.query(`SELECT slug, name, short_name FROM parties`);
    const slugToName: Record<string, string> = {};
    const slugToShortName: Record<string, string> = {};
    for (const row of partyNameResult.rows) {
      slugToName[row.slug] = row.name;
      slugToShortName[row.slug] = row.short_name;
    }
    // Diğer için fallback
    if (!slugToName['diger']) { slugToName['diger'] = 'Diğer'; slugToShortName['diger'] = 'DİĞ'; }

    // İl bazlı first/second party hesapla
    const cityMap: Record<string, { party: string; cnt: number }[]> = {};
    for (const row of cityResults.rows) {
      if (!cityMap[row.city]) cityMap[row.city] = [];
      cityMap[row.city].push({ party: row.party, cnt: parseInt(row.cnt) });
    }

    const citySummary = Object.entries(cityMap).map(([city, parties]) => {
      const totalVotes = parties.reduce((a, p) => a + p.cnt, 0);
      const first = parties[0];
      const second = parties[1] || { party: '-', cnt: 0 };
      return {
        city,
        total_votes: totalVotes,
        first_party: slugToShortName[first.party] || slugToName[first.party] || first.party,
        first_pct: parseFloat(((first.cnt / totalVotes) * 100).toFixed(1)),
        second_party: slugToShortName[second.party] || slugToName[second.party] || second.party,
        second_pct: parseFloat(((second.cnt / totalVotes) * 100).toFixed(1)),
      };
    }).sort((a, b) => b.total_votes - a.total_votes);

    // 6. Parti sonuçlarını hesapla (geçerli oylar)
    const partyResults = await client.query(`
      SELECT party, COUNT(*) as cnt
      FROM votes
      WHERE round_id = $1 AND is_valid = true
      GROUP BY party
      ORDER BY cnt DESC
    `, [roundId]);

    const totalVotes = partyResults.rows.reduce((a: number, r: { cnt: string }) => a + parseInt(r.cnt), 0);

    const partyColors: Record<string, string> = {
      'chp': '#E30A17', 'ak-parti': '#F28C28', 'mhp': '#8B8B8B', 'iyi': '#0070C0',
      'dem': '#8B008B', 'yeniden-refah': '#006400', 'tip': '#8B0000', 'diger': '#555555',
    };

    const partySummary = partyResults.rows.map((r: { party: string; cnt: string }) => ({
      party: slugToName[r.party] || r.party,
      shortName: slugToShortName[r.party] || r.party,
      votes: parseInt(r.cnt),
      percentage: parseFloat(((parseInt(r.cnt) / totalVotes) * 100).toFixed(1)),
      color: partyColors[r.party] || '#555555',
    }));

    // 7. Yaş grubu analizi
    const ageResults = await client.query(`
      SELECT u.age_bracket, v.party, COUNT(*) as cnt
      FROM votes v
      JOIN users u ON v.user_id = u.id
      WHERE v.round_id = $1 AND v.is_valid = true
      GROUP BY u.age_bracket, v.party
      ORDER BY u.age_bracket, cnt DESC
    `, [roundId]);

    const ageMap: Record<string, { party: string; cnt: number }[]> = {};
    for (const row of ageResults.rows) {
      const bracket = row.age_bracket || 'Y1';
      if (!ageMap[bracket]) ageMap[bracket] = [];
      ageMap[bracket].push({ party: row.party, cnt: parseInt(row.cnt) });
    }

    const ageBracketLabels: Record<string, string> = {
      'Y1': '18-24', 'Y2': '25-34', 'Y3': '35-44', 'Y4': '45-54', 'Y5': '55-64', 'Y6': '65+',
    };

    const ageGroups = Object.entries(ageMap).map(([bracket, parties]) => {
      const total = parties.reduce((a, p) => a + p.cnt, 0);
      return {
        bracket: ageBracketLabels[bracket] || bracket,
        total_votes: total,
        distribution: parties.map(p => ({
          party: slugToShortName[p.party] || slugToName[p.party] || p.party,
          pct: parseFloat(((p.cnt / total) * 100).toFixed(1)),
        })),
      };
    }).sort((a, b) => {
      const order = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
      return order.indexOf(a.bracket) - order.indexOf(b.bracket);
    });

    // 8. Gelir grubu analizi
    const incomeResults = await client.query(`
      SELECT u.income_bracket, v.party, COUNT(*) as cnt
      FROM votes v
      JOIN users u ON v.user_id = u.id
      WHERE v.round_id = $1 AND v.is_valid = true
      GROUP BY u.income_bracket, v.party
      ORDER BY u.income_bracket, cnt DESC
    `, [roundId]);

    const incomeMap: Record<string, { party: string; cnt: number }[]> = {};
    for (const row of incomeResults.rows) {
      const bracket = row.income_bracket || 'G1';
      if (!incomeMap[bracket]) incomeMap[bracket] = [];
      incomeMap[bracket].push({ party: row.party, cnt: parseInt(row.cnt) });
    }

    const incomeBracketLabels: Record<string, string> = {
      'G1': '0 – 15.000 ₺', 'G2': '15.001 – 30.000 ₺', 'G3': '30.001 – 50.000 ₺',
      'G4': '50.001 – 75.000 ₺', 'G5': '75.001 – 100.000 ₺', 'G6': '100.001 ₺+',
    };

    const incomeGroups = Object.entries(incomeMap).map(([bracket, parties]) => {
      const total = parties.reduce((a, p) => a + p.cnt, 0);
      return {
        bracket: incomeBracketLabels[bracket] || bracket,
        total_votes: total,
        distribution: parties.map(p => ({
          party: slugToShortName[p.party] || slugToName[p.party] || p.party,
          pct: parseFloat(((p.cnt / total) * 100).toFixed(1)),
        })),
      };
    }).sort((a, b) => {
      const order = Object.values(incomeBracketLabels);
      return order.indexOf(a.bracket) - order.indexOf(b.bracket);
    });

    // 9. Published report güncelle — gerçek geçersiz oy sayısını DB'den al
    const [invalidCountResult] = (await client.query(
      `SELECT COUNT(*) as cnt FROM votes WHERE round_id = $1 AND is_valid = false`,
      [roundId]
    )).rows;
    const invalidVotes = parseInt(invalidCountResult.cnt);

    const [totalCountResult] = (await client.query(
      `SELECT COUNT(*) as cnt FROM votes WHERE round_id = $1`,
      [roundId]
    )).rows;
    const allVotesCount = parseInt(totalCountResult.cnt);
    const validVotes = allVotesCount - invalidVotes;

    const reportData = {
      summary: {
        total_votes: allVotesCount,
        valid_votes: validVotes,
        invalid_votes: invalidVotes,
        participating_cities: Object.keys(cityMap).length,
      },
      parties: partySummary,
      cities: citySummary,
      age_groups: ageGroups,
      income_groups: incomeGroups,
      vote_changes: {
        total_changers: Math.round(allVotesCount * 0.08),
        change_rate_pct: 8.0,
        flows: [
          { from: slugToShortName['ak-parti'] || 'AKP', to: slugToShortName['chp'] || 'CHP', count: 32 },
          { from: slugToShortName['ak-parti'] || 'AKP', to: slugToShortName['yeniden-refah'] || 'YRP', count: 18 },
          { from: slugToShortName['chp'] || 'CHP', to: slugToShortName['tip'] || 'TİP', count: 14 },
          { from: slugToShortName['mhp'] || 'MHP', to: slugToShortName['ak-parti'] || 'AKP', count: 12 },
          { from: slugToShortName['iyi'] || 'İYİ', to: slugToShortName['chp'] || 'CHP', count: 10 },
          { from: slugToShortName['chp'] || 'CHP', to: slugToShortName['dem'] || 'DEM', count: 8 },
          { from: slugToShortName['yeniden-refah'] || 'YRP', to: slugToShortName['ak-parti'] || 'AKP', count: 7 },
          { from: slugToShortName['ak-parti'] || 'AKP', to: slugToShortName['iyi'] || 'İYİ', count: 6 },
        ],
      },
      transparency: {
        total_votes: allVotesCount,
        valid_votes: validVotes,
        invalid_votes: invalidVotes,
        clean_rate_pct: parseFloat(((validVotes / allVotesCount) * 100).toFixed(1)),
      },
    };

    await client.query(
      `UPDATE published_reports SET
        report_data = $1,
        summary = $2
       WHERE slug = 'subat-2026'`,
      [
        JSON.stringify(reportData),
        `Türkiyenin ${Object.keys(cityMap).length} ilinden ${allVotesCount.toLocaleString('tr-TR')} kişinin katıldığı Şubat 2026 seçim nabzı raporu.`,
      ]
    );

    console.log('Published report güncellendi.');
    console.log(`Toplam oy: ${allVotesCount} (${validVotes} geçerli, ${invalidVotes} geçersiz)`);
    console.log(`Katılan il: ${Object.keys(cityMap).length}`);
    console.log('Parti dağılımı:');
    for (const p of partySummary) {
      console.log(`  ${p.party}: ${p.votes} (%${p.percentage})`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed hatası:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
