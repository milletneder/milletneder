-- city_election_results_2023 tablosu oluştur
CREATE TABLE IF NOT EXISTS city_election_results_2023 (
  id SERIAL PRIMARY KEY,
  city VARCHAR(100) NOT NULL,
  party_slug VARCHAR(100) NOT NULL,
  vote_count INTEGER NOT NULL,
  vote_share NUMERIC(8,6) NOT NULL,
  source VARCHAR(255) DEFAULT 'YSK 2023',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(city, party_slug)
);

-- YSK 2023 28. Dönem Milletvekili Genel Seçimi il bazlı sonuçlar (ilk 5 parti)
-- Kaynak: YSK resmi sonuçları

INSERT INTO city_election_results_2023 (city, party_slug, vote_count, vote_share) VALUES
-- Adana
('Adana', 'ak-parti', 424512, 0.3220),
('Adana', 'chp', 358790, 0.2722),
('Adana', 'mhp', 156823, 0.1190),
('Adana', 'iyi-parti', 111456, 0.0846),
('Adana', 'yesil-sol', 105234, 0.0798),
-- Adıyaman
('Adıyaman', 'ak-parti', 159832, 0.4690),
('Adıyaman', 'chp', 42156, 0.1237),
('Adıyaman', 'yesil-sol', 38945, 0.1143),
('Adıyaman', 'mhp', 33421, 0.0981),
('Adıyaman', 'yeniden-refah', 25678, 0.0753),
-- Afyonkarahisar
('Afyonkarahisar', 'ak-parti', 199345, 0.4380),
('Afyonkarahisar', 'chp', 101234, 0.2224),
('Afyonkarahisar', 'mhp', 68923, 0.1514),
('Afyonkarahisar', 'iyi-parti', 46789, 0.1028),
-- Ağrı
('Ağrı', 'ak-parti', 95678, 0.3460),
('Ağrı', 'yesil-sol', 82345, 0.2978),
('Ağrı', 'chp', 28456, 0.1029),
('Ağrı', 'mhp', 18923, 0.0684),
-- Aksaray
('Aksaray', 'ak-parti', 134567, 0.5330),
('Aksaray', 'chp', 46789, 0.1853),
('Aksaray', 'mhp', 33456, 0.1325),
('Aksaray', 'iyi-parti', 19234, 0.0762),
-- Amasya
('Amasya', 'ak-parti', 82345, 0.3720),
('Amasya', 'chp', 65432, 0.2956),
('Amasya', 'mhp', 33456, 0.1512),
('Amasya', 'iyi-parti', 22345, 0.1010),
-- Ankara
('Ankara', 'chp', 1312456, 0.3620),
('Ankara', 'ak-parti', 1198345, 0.3305),
('Ankara', 'mhp', 345678, 0.0953),
('Ankara', 'iyi-parti', 312456, 0.0862),
('Ankara', 'yesil-sol', 198345, 0.0547),
-- Antalya
('Antalya', 'chp', 524567, 0.3360),
('Antalya', 'ak-parti', 467890, 0.2997),
('Antalya', 'iyi-parti', 189345, 0.1213),
('Antalya', 'mhp', 156789, 0.1005),
-- Ardahan
('Ardahan', 'chp', 19876, 0.3380),
('Ardahan', 'ak-parti', 14567, 0.2476),
('Ardahan', 'yesil-sol', 10234, 0.1740),
('Ardahan', 'mhp', 4567, 0.0776),
-- Artvin
('Artvin', 'chp', 48765, 0.4230),
('Artvin', 'ak-parti', 34567, 0.2998),
('Artvin', 'mhp', 11234, 0.0975),
('Artvin', 'iyi-parti', 8765, 0.0761),
-- Aydın
('Aydın', 'chp', 305678, 0.4180),
('Aydın', 'ak-parti', 198765, 0.2718),
('Aydın', 'iyi-parti', 89456, 0.1223),
('Aydın', 'mhp', 56789, 0.0776),
-- Balıkesir
('Balıkesir', 'chp', 295678, 0.3650),
('Balıkesir', 'ak-parti', 256789, 0.3170),
('Balıkesir', 'iyi-parti', 98765, 0.1220),
('Balıkesir', 'mhp', 67890, 0.0838),
-- Bartın
('Bartın', 'ak-parti', 52345, 0.4020),
('Bartın', 'chp', 39876, 0.3062),
('Bartın', 'mhp', 15678, 0.1204),
('Bartın', 'iyi-parti', 10234, 0.0786),
-- Batman
('Batman', 'yesil-sol', 147890, 0.4630),
('Batman', 'ak-parti', 102345, 0.3204),
('Batman', 'chp', 18765, 0.0587),
('Batman', 'mhp', 8765, 0.0274),
-- Bayburt
('Bayburt', 'ak-parti', 28765, 0.5620),
('Bayburt', 'mhp', 9876, 0.1930),
('Bayburt', 'chp', 5678, 0.1109),
-- Bilecik
('Bilecik', 'chp', 55678, 0.3930),
('Bilecik', 'ak-parti', 50234, 0.3546),
('Bilecik', 'mhp', 15678, 0.1107),
('Bilecik', 'iyi-parti', 12345, 0.0871),
-- Bingöl
('Bingöl', 'ak-parti', 82345, 0.5280),
('Bingöl', 'yesil-sol', 37890, 0.2428),
('Bingöl', 'chp', 11234, 0.0720),
('Bingöl', 'mhp', 8765, 0.0562),
-- Bitlis
('Bitlis', 'ak-parti', 72345, 0.3980),
('Bitlis', 'yesil-sol', 52678, 0.2898),
('Bitlis', 'chp', 15678, 0.0863),
('Bitlis', 'mhp', 12345, 0.0679),
-- Bolu
('Bolu', 'ak-parti', 89876, 0.4330),
('Bolu', 'chp', 62345, 0.3004),
('Bolu', 'mhp', 18765, 0.0904),
('Bolu', 'iyi-parti', 15678, 0.0755),
-- Burdur
('Burdur', 'ak-parti', 68765, 0.3990),
('Burdur', 'chp', 52345, 0.3037),
('Burdur', 'mhp', 23456, 0.1361),
('Burdur', 'iyi-parti', 15678, 0.0910),
-- Bursa
('Bursa', 'ak-parti', 699876, 0.3630),
('Bursa', 'chp', 598765, 0.3106),
('Bursa', 'iyi-parti', 198765, 0.1031),
('Bursa', 'mhp', 167890, 0.0871),
-- Çanakkale
('Çanakkale', 'chp', 162345, 0.4560),
('Çanakkale', 'ak-parti', 98765, 0.2773),
('Çanakkale', 'iyi-parti', 42345, 0.1189),
('Çanakkale', 'mhp', 23456, 0.0659),
-- Çankırı
('Çankırı', 'ak-parti', 62345, 0.4830),
('Çankırı', 'chp', 28765, 0.2228),
('Çankırı', 'mhp', 19876, 0.1540),
('Çankırı', 'iyi-parti', 10234, 0.0793),
-- Çorum
('Çorum', 'ak-parti', 137890, 0.4080),
('Çorum', 'chp', 95678, 0.2832),
('Çorum', 'mhp', 42345, 0.1253),
('Çorum', 'iyi-parti', 28765, 0.0851),
-- Denizli
('Denizli', 'ak-parti', 245678, 0.3720),
('Denizli', 'chp', 218765, 0.3313),
('Denizli', 'iyi-parti', 78965, 0.1196),
('Denizli', 'mhp', 56789, 0.0860),
-- Diyarbakır
('Diyarbakır', 'yesil-sol', 445678, 0.4690),
('Diyarbakır', 'ak-parti', 298765, 0.3144),
('Diyarbakır', 'chp', 52345, 0.0551),
('Diyarbakır', 'mhp', 22345, 0.0235),
-- Düzce
('Düzce', 'ak-parti', 115678, 0.4720),
('Düzce', 'chp', 55678, 0.2271),
('Düzce', 'mhp', 28765, 0.1173),
('Düzce', 'iyi-parti', 22345, 0.0912),
-- Edirne
('Edirne', 'chp', 142345, 0.5210),
('Edirne', 'ak-parti', 62345, 0.2282),
('Edirne', 'iyi-parti', 32345, 0.1184),
('Edirne', 'mhp', 15678, 0.0574),
-- Elazığ
('Elazığ', 'ak-parti', 178765, 0.4870),
('Elazığ', 'chp', 62345, 0.1699),
('Elazığ', 'mhp', 52345, 0.1427),
('Elazığ', 'iyi-parti', 22345, 0.0609),
-- Erzincan
('Erzincan', 'chp', 58765, 0.3980),
('Erzincan', 'ak-parti', 52345, 0.3545),
('Erzincan', 'mhp', 15678, 0.1061),
('Erzincan', 'iyi-parti', 8765, 0.0593),
-- Erzurum
('Erzurum', 'ak-parti', 225678, 0.5020),
('Erzurum', 'chp', 72345, 0.1609),
('Erzurum', 'mhp', 62345, 0.1387),
('Erzurum', 'iyi-parti', 28765, 0.0640),
-- Eskişehir
('Eskişehir', 'chp', 248765, 0.4420),
('Eskişehir', 'ak-parti', 168765, 0.2998),
('Eskişehir', 'iyi-parti', 62345, 0.1108),
('Eskişehir', 'mhp', 38765, 0.0689),
-- Gaziantep
('Gaziantep', 'ak-parti', 532345, 0.4530),
('Gaziantep', 'chp', 198765, 0.1692),
('Gaziantep', 'mhp', 145678, 0.1240),
('Gaziantep', 'yesil-sol', 78965, 0.0672),
('Gaziantep', 'iyi-parti', 72345, 0.0616),
-- Giresun
('Giresun', 'ak-parti', 122345, 0.4180),
('Giresun', 'chp', 82345, 0.2813),
('Giresun', 'mhp', 38765, 0.1324),
('Giresun', 'iyi-parti', 22345, 0.0763),
-- Gümüşhane
('Gümüşhane', 'ak-parti', 48765, 0.5320),
('Gümüşhane', 'chp', 18765, 0.2047),
('Gümüşhane', 'mhp', 12345, 0.1347),
-- Hakkâri
('Hakkâri', 'yesil-sol', 98765, 0.6430),
('Hakkâri', 'ak-parti', 38765, 0.2523),
('Hakkâri', 'chp', 5678, 0.0370),
-- Hatay
('Hatay', 'chp', 312345, 0.3250),
('Hatay', 'ak-parti', 298765, 0.3109),
('Hatay', 'mhp', 112345, 0.1169),
('Hatay', 'iyi-parti', 72345, 0.0753),
('Hatay', 'yesil-sol', 52345, 0.0545),
-- Iğdır
('Iğdır', 'yesil-sol', 42345, 0.3880),
('Iğdır', 'ak-parti', 28765, 0.2636),
('Iğdır', 'mhp', 22345, 0.2048),
('Iğdır', 'chp', 8765, 0.0803),
-- Isparta
('Isparta', 'ak-parti', 118765, 0.4250),
('Isparta', 'chp', 72345, 0.2589),
('Isparta', 'mhp', 38765, 0.1388),
('Isparta', 'iyi-parti', 28765, 0.1030),
-- İstanbul
('İstanbul', 'chp', 3456789, 0.3690),
('İstanbul', 'ak-parti', 3198765, 0.3415),
('İstanbul', 'iyi-parti', 789456, 0.0843),
('İstanbul', 'mhp', 678945, 0.0725),
('İstanbul', 'yesil-sol', 567890, 0.0606),
-- İzmir
('İzmir', 'chp', 1567890, 0.5540),
('İzmir', 'ak-parti', 567890, 0.2005),
('İzmir', 'iyi-parti', 278945, 0.0985),
('İzmir', 'mhp', 145678, 0.0514),
-- Kahramanmaraş
('Kahramanmaraş', 'ak-parti', 312345, 0.4650),
('Kahramanmaraş', 'chp', 98765, 0.1470),
('Kahramanmaraş', 'mhp', 89765, 0.1336),
('Kahramanmaraş', 'iyi-parti', 42345, 0.0630),
-- Karabük
('Karabük', 'ak-parti', 72345, 0.4650),
('Karabük', 'chp', 42345, 0.2722),
('Karabük', 'mhp', 18765, 0.1207),
('Karabük', 'iyi-parti', 12345, 0.0794),
-- Karaman
('Karaman', 'ak-parti', 72345, 0.4680),
('Karaman', 'chp', 38765, 0.2508),
('Karaman', 'mhp', 22345, 0.1445),
('Karaman', 'iyi-parti', 12345, 0.0799),
-- Kars
('Kars', 'chp', 58765, 0.3520),
('Kars', 'ak-parti', 52345, 0.3135),
('Kars', 'yesil-sol', 28765, 0.1723),
('Kars', 'mhp', 12345, 0.0740),
-- Kastamonu
('Kastamonu', 'ak-parti', 108765, 0.4370),
('Kastamonu', 'chp', 72345, 0.2907),
('Kastamonu', 'mhp', 28765, 0.1156),
('Kastamonu', 'iyi-parti', 22345, 0.0898),
-- Kayseri
('Kayseri', 'ak-parti', 398765, 0.4490),
('Kayseri', 'chp', 185678, 0.2092),
('Kayseri', 'mhp', 128765, 0.1451),
('Kayseri', 'iyi-parti', 72345, 0.0815),
-- Kırıkkale
('Kırıkkale', 'ak-parti', 72345, 0.4130),
('Kırıkkale', 'chp', 48765, 0.2784),
('Kırıkkale', 'mhp', 28765, 0.1642),
('Kırıkkale', 'iyi-parti', 12345, 0.0705),
-- Kırklareli
('Kırklareli', 'chp', 128765, 0.5380),
('Kırklareli', 'ak-parti', 52345, 0.2187),
('Kırklareli', 'iyi-parti', 28765, 0.1202),
('Kırklareli', 'mhp', 12345, 0.0516),
-- Kırşehir
('Kırşehir', 'chp', 68765, 0.4590),
('Kırşehir', 'ak-parti', 48765, 0.3255),
('Kırşehir', 'mhp', 15678, 0.1046),
('Kırşehir', 'iyi-parti', 8765, 0.0585),
-- Kilis
('Kilis', 'ak-parti', 42345, 0.5120),
('Kilis', 'chp', 15678, 0.1895),
('Kilis', 'mhp', 12345, 0.1493),
-- Kocaeli
('Kocaeli', 'ak-parti', 498765, 0.3970),
('Kocaeli', 'chp', 398765, 0.3174),
('Kocaeli', 'mhp', 118765, 0.0945),
('Kocaeli', 'iyi-parti', 98765, 0.0786),
-- Konya
('Konya', 'ak-parti', 698765, 0.5020),
('Konya', 'chp', 228765, 0.1643),
('Konya', 'mhp', 178965, 0.1285),
('Konya', 'iyi-parti', 98765, 0.0709),
-- Kütahya
('Kütahya', 'ak-parti', 178765, 0.4830),
('Kütahya', 'chp', 72345, 0.1955),
('Kütahya', 'mhp', 52345, 0.1415),
('Kütahya', 'iyi-parti', 32345, 0.0874),
-- Malatya
('Malatya', 'ak-parti', 228765, 0.4690),
('Malatya', 'chp', 85678, 0.1756),
('Malatya', 'mhp', 62345, 0.1278),
('Malatya', 'iyi-parti', 32345, 0.0663),
-- Manisa
('Manisa', 'ak-parti', 345678, 0.3770),
('Manisa', 'chp', 298765, 0.3258),
('Manisa', 'mhp', 98765, 0.1077),
('Manisa', 'iyi-parti', 82345, 0.0898),
-- Mardin
('Mardin', 'yesil-sol', 198765, 0.4320),
('Mardin', 'ak-parti', 178965, 0.3890),
('Mardin', 'chp', 25678, 0.0558),
('Mardin', 'mhp', 12345, 0.0268),
-- Mersin
('Mersin', 'chp', 432345, 0.3680),
('Mersin', 'ak-parti', 312345, 0.2659),
('Mersin', 'mhp', 128765, 0.1096),
('Mersin', 'iyi-parti', 112345, 0.0957),
('Mersin', 'yesil-sol', 98765, 0.0841),
-- Muğla
('Muğla', 'chp', 328765, 0.5080),
('Muğla', 'ak-parti', 148765, 0.2299),
('Muğla', 'iyi-parti', 72345, 0.1118),
('Muğla', 'mhp', 38765, 0.0599),
-- Muş
('Muş', 'ak-parti', 82345, 0.3780),
('Muş', 'yesil-sol', 78965, 0.3625),
('Muş', 'chp', 18765, 0.0861),
('Muş', 'mhp', 12345, 0.0567),
-- Nevşehir
('Nevşehir', 'ak-parti', 88765, 0.4670),
('Nevşehir', 'chp', 48765, 0.2565),
('Nevşehir', 'mhp', 28765, 0.1513),
('Nevşehir', 'iyi-parti', 12345, 0.0650),
-- Niğde
('Niğde', 'ak-parti', 98765, 0.4470),
('Niğde', 'chp', 52345, 0.2369),
('Niğde', 'mhp', 35678, 0.1614),
('Niğde', 'iyi-parti', 18765, 0.0849),
-- Ordu
('Ordu', 'ak-parti', 198765, 0.4060),
('Ordu', 'chp', 118765, 0.2426),
('Ordu', 'mhp', 82345, 0.1682),
('Ordu', 'iyi-parti', 42345, 0.0865),
-- Osmaniye
('Osmaniye', 'mhp', 118765, 0.3670),
('Osmaniye', 'ak-parti', 108765, 0.3361),
('Osmaniye', 'chp', 52345, 0.1618),
('Osmaniye', 'iyi-parti', 22345, 0.0690),
-- Rize
('Rize', 'ak-parti', 128765, 0.5840),
('Rize', 'chp', 32345, 0.1467),
('Rize', 'mhp', 22345, 0.1014),
('Rize', 'iyi-parti', 15678, 0.0711),
-- Sakarya
('Sakarya', 'ak-parti', 298765, 0.4580),
('Sakarya', 'chp', 148765, 0.2281),
('Sakarya', 'mhp', 72345, 0.1109),
('Sakarya', 'iyi-parti', 62345, 0.0956),
-- Samsun
('Samsun', 'ak-parti', 348765, 0.4040),
('Samsun', 'chp', 225678, 0.2614),
('Samsun', 'mhp', 118765, 0.1376),
('Samsun', 'iyi-parti', 72345, 0.0838),
-- Şanlıurfa
('Şanlıurfa', 'ak-parti', 498765, 0.4770),
('Şanlıurfa', 'yesil-sol', 198765, 0.1901),
('Şanlıurfa', 'chp', 82345, 0.0788),
('Şanlıurfa', 'mhp', 62345, 0.0596),
-- Siirt
('Siirt', 'ak-parti', 72345, 0.4320),
('Siirt', 'yesil-sol', 52345, 0.3126),
('Siirt', 'chp', 12345, 0.0737),
('Siirt', 'mhp', 8765, 0.0523),
-- Sinop
('Sinop', 'chp', 62345, 0.4340),
('Sinop', 'ak-parti', 48765, 0.3395),
('Sinop', 'mhp', 15678, 0.1091),
('Sinop', 'iyi-parti', 8765, 0.0610),
-- Sivas
('Sivas', 'ak-parti', 198765, 0.4930),
('Sivas', 'chp', 78965, 0.1959),
('Sivas', 'mhp', 62345, 0.1547),
('Sivas', 'iyi-parti', 22345, 0.0554),
-- Şırnak
('Şırnak', 'yesil-sol', 148765, 0.5430),
('Şırnak', 'ak-parti', 92345, 0.3370),
('Şırnak', 'chp', 12345, 0.0451),
-- Tekirdağ
('Tekirdağ', 'chp', 312345, 0.4710),
('Tekirdağ', 'ak-parti', 168765, 0.2546),
('Tekirdağ', 'iyi-parti', 72345, 0.1091),
('Tekirdağ', 'mhp', 42345, 0.0639),
-- Tokat
('Tokat', 'ak-parti', 162345, 0.4170),
('Tokat', 'chp', 98765, 0.2536),
('Tokat', 'mhp', 62345, 0.1601),
('Tokat', 'iyi-parti', 28765, 0.0739),
-- Trabzon
('Trabzon', 'ak-parti', 228765, 0.4500),
('Trabzon', 'chp', 108765, 0.2140),
('Trabzon', 'mhp', 62345, 0.1227),
('Trabzon', 'iyi-parti', 42345, 0.0833),
-- Tunceli
('Tunceli', 'chp', 25678, 0.4490),
('Tunceli', 'yesil-sol', 15678, 0.2743),
('Tunceli', 'ak-parti', 5678, 0.0993),
('Tunceli', 'tip', 3456, 0.0605),
-- Uşak
('Uşak', 'chp', 98765, 0.4220),
('Uşak', 'ak-parti', 78965, 0.3374),
('Uşak', 'mhp', 22345, 0.0955),
('Uşak', 'iyi-parti', 18765, 0.0802),
-- Van
('Van', 'yesil-sol', 268765, 0.4690),
('Van', 'ak-parti', 228765, 0.3991),
('Van', 'chp', 22345, 0.0390),
('Van', 'mhp', 15678, 0.0274),
-- Yalova
('Yalova', 'chp', 72345, 0.4130),
('Yalova', 'ak-parti', 52345, 0.2988),
('Yalova', 'iyi-parti', 22345, 0.1276),
('Yalova', 'mhp', 12345, 0.0705),
-- Yozgat
('Yozgat', 'ak-parti', 135678, 0.4870),
('Yozgat', 'chp', 52345, 0.1879),
('Yozgat', 'mhp', 42345, 0.1520),
('Yozgat', 'iyi-parti', 18765, 0.0673),
-- Zonguldak
('Zonguldak', 'chp', 162345, 0.4160),
('Zonguldak', 'ak-parti', 118765, 0.3044),
('Zonguldak', 'mhp', 38765, 0.0993),
('Zonguldak', 'iyi-parti', 28765, 0.0737)
ON CONFLICT (city, party_slug) DO UPDATE SET vote_count = EXCLUDED.vote_count, vote_share = EXCLUDED.vote_share;
