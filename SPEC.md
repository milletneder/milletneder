# milletneder.com - Teknik Spesifikasyon ve Sistem Dokümantasyonu

> Son Guncelleme: 1 Nisan 2026
> Bu dosya, sistemin tam teknik haritasıdır. Herhangi bir AI asistanı veya yeni geliştirici bu dosyayı okuyarak projeyi tamamen anlayabilir.

---

## 1. Proje Ozeti

**milletneder.com** Turkiye'nin 81 ilini kapsayan, aylık turlarda calisan bir online secim anketi platformudur. Kullanicilar kayit olup oy kullanir; sonuclar demografik agirlıklandırma, sahtecılik tespıtı ve ıstatıstıksel duzeltmeler uygulanarak gosterılır.

**Temel Prensip:** Seffaflık. Tum metodolojiler, parametreler ve hesaplama yontemleri acik sekılde yayinlanir.

### Teknoloji Yigini
- **Framework:** Next.js 15.5 (App Router, TypeScript)
- **UI:** Tailwind CSS 4, Framer Motion
- **ORM:** Drizzle ORM 0.45
- **Veritabani:** PostgreSQL
- **Harita:** react-simple-maps + d3-geo
- **Kimlik Dogrulama:** Firebase Authentication (email/sifre + telefon/SMS) + JWT (kullanıcı ve admin ayri)
- **Firebase:** firebase ^12.11, firebase-admin ^13.7
- **Parmak Izi:** @fingerprintjs/fingerprintjs
- **Hosting:** VPS (PM2)

---

## 2. Veritabani Semasi

### 2.1 Cekirdek Tablolar

#### `users`
Kullanıcı hesapları ve demografik bilgiler.

**SIFIR PII MIMARISI:** Veritabaninda email, telefon, isim veya sifre SAKLANMAZ. Kimlik dogrulama tamamen Firebase Authentication uzerinden yapilir. Veritabaninda sadece `firebase_uid` tutulur — Firebase ile baglanti noktasi.

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| id | serial PK | |
| firebase_uid | varchar(128) UNIQUE NOT NULL | Firebase Authentication UID |
| identity_hash | varchar(64) | Email/telefon SHA256 hash'i (PII olmadan kimlik tanimlama) |
| city | varchar(100) | 81 il |
| district | varchar(100) | Ilce |
| age_bracket | varchar(5) | Y1-Y6 |
| income_bracket | varchar(5) | G1-G6 |
| gender | varchar(2) | E / K |
| education | varchar(5) | E1-E5 |
| turnout_intention | varchar(5) | T1-T4 |
| previous_vote_2023 | varchar(100) | parti slug veya 'yok' |
| auth_provider | varchar(10) | 'email' veya 'phone' |
| referral_code | varchar(20) UNIQUE | |
| referred_by | integer | |
| is_flagged | boolean | Supheli hesap |
| flag_reason | text | |
| is_active | boolean | |
| is_dummy | boolean | Sentetik kullanici |
| badges | text | JSON array, default '[]' |
| last_login_at | timestamp | |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexler:** `users_firebase_uid_idx` (unique), `users_referral_code_idx` (unique)

#### `rounds`
Oylama turlari (aylik).

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| id | serial PK | |
| start_date | timestamp | |
| end_date | timestamp | |
| is_active | boolean | Tek bir tur aktif olabilir |
| is_published | boolean | Sonuclar yayinlandi mi |
| created_at | timestamp | |

#### `votes`
Kullanıcı oyları.

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| id | serial PK | |
| user_id | FK users | |
| round_id | FK rounds | |
| party | varchar(100) | Parti slug |
| city | varchar(100) | Oy anindaki sehir |
| district | varchar(100) | |
| is_valid | boolean | |
| is_dummy | boolean | Sentetik veri |
| is_carried_over | boolean | Onceki turdan tasinan |
| change_count | integer | Oy degistirme sayisi |
| created_at | timestamp | |
| updated_at | timestamp | |

**Onemli:** Her kullanıcının her turda en son oyu gecerlidir. Sorgularda `DISTINCT ON (user_id) ... ORDER BY user_id, round_id DESC` kullanilir.

#### `parties`
Siyasi partiler (admin panelinden yonetilir).

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| id | serial PK | |
| slug | varchar(100) UNIQUE | URL-uyumlu kimlik (orn: "akp", "chp") |
| name | varchar(255) | Tam ad |
| short_name | varchar(50) | Kisa ad (gosterim icin) |
| color | varchar(7) | Hex renk kodu |
| text_color | varchar(7) | Metin rengi |
| logo_url | varchar(500) | |
| sort_order | integer | |
| created_at | timestamp | |

**Ozel Slug:** `karasizim` — "Kararsizim" oyu. Sonuclara dahil edilmez, oy kullanilmis sayilir ama parti dagiliminda gosterilmez.

### 2.2 Agirliklandirma Tablolari

#### `weighting_configs`
Her agirliklandirma yonteminin acik/kapali durumu ve parametreleri.

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| id | serial PK | |
| round_id | FK rounds (nullable) | NULL = global default |
| config_key | varchar(100) | Yontem adi |
| is_enabled | boolean | |
| parameters | jsonb | Yonteme ozel parametreler |
| updated_by | FK admins | |
| created_at | timestamp | |
| updated_at | timestamp | |

**UNIQUE(round_id, config_key)**

Gecerli `config_key` degerleri ve **su anki durumlari (Mart 2026):**

| config_key | Durum | Parametreler |
|-----------|-------|-------------|
| `raking` | **AKTIF** | dimensions: ["age","gender","education","region"], maxIterations: 50, convergenceThreshold: 0.001 |
| `turnout` | **AKTIF** | weights: { T1: 1, T2: 0.6, T3: 0.3, T4: 0.25 } |
| `recency` | **AKTIF** | lambda: 0.01 |
| `partisan_bias` | **AKTIF** | (parametresiz, otomatik hesaplar) |
| `fraud_detection` | **AKTIF** | threshold: 80 |
| `weight_cap` | **AKTIF** | min: 0.4, max: 2.5 |
| `post_stratification` | DEVRE DISI | (raking aktifken calismaz) |
| `regional_quota` | DEVRE DISI | (raking zaten region boyutunu kapsiyor) |
| `bayesian` | DEVRE DISI | (engine'de implemente edilmemis) |

#### `reference_demographics`
TUIK referans nufus dagilimi. Agirliklandirma icin hedef oranlar.

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| id | serial PK | |
| dimension | varchar(50) | age, gender, education, region |
| category | varchar(100) | Y1, E, E3, marmara vb. |
| population_share | numeric(8,6) | 0-1 arasi oran |
| source | varchar(255) | Kaynak (orn: "TUIK 2024") |
| year | integer | |

**UNIQUE(dimension, category)**

**Mevcut Boyutlar ve Kategoriler:**

| Boyut | Kategoriler | Kaynak |
|-------|------------|--------|
| age | Y1 (18-24), Y2 (25-34), Y3 (35-44), Y4 (45-54), Y5 (55-64), Y6 (65+) | TUIK 2024 |
| gender | E (Erkek), K (Kadin) | TUIK 2024 |
| education | E1 (Ilkokul), E2 (Ortaokul), E3 (Lise), E4 (Universite), E5 (Lisansustu) | TUIK 2024 |
| region | marmara, ic_anadolu, ege, akdeniz, karadeniz, guneydogu_anadolu, dogu_anadolu | YSK secmen |

**NOT:** `income` boyutu icin referans veri YOKTUR. Gelir bilgisi toplanir ama agirliklandirmada kullanilmaz.

#### `election_results_2023`
2023 genel secim sonuclari (ulusal). Partizan sapma duzeltmesi icin.

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| party_slug | varchar(100) | |
| vote_share | numeric(8,6) | 0-1 arasi oran |
| vote_count | integer | |
| source | varchar(255) | Default: 'YSK' |

#### `city_election_results_2023`
2023 secim sonuclari (il bazli). Beraberlik durumunda tiebreaker olarak kullanilir.

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| city | varchar(100) | |
| party_slug | varchar(100) | |
| vote_count | integer | |
| vote_share | numeric(8,6) | |

#### `fraud_scores`
Kullanıcı bazli sahtecılık puanı.

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| user_id | FK users UNIQUE | |
| score | numeric(5,2) | 0-100 |
| factors | jsonb | Puan kirilimi |
| is_vpn | boolean | |
| subnet_group | varchar(20) | IP /24 grubu |
| last_calculated | timestamp | |

#### `weighted_results_cache`
Hesaplanmis sonuc onbellegi.

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| round_id | FK rounds | |
| cache_key | varchar(255) | 'national', 'city-map' vb. |
| raw_results | jsonb | Ham sonuclar |
| weighted_results | jsonb | Agirlikli sonuclar |
| confidence | jsonb | Guven skoru |
| methodology | jsonb | Aktif yontemler |
| calculated_at | timestamp | |
| expires_at | timestamp | |

**UNIQUE(round_id, cache_key)**
**TTL:** Aktif tur = 5 dk, kapali tur = 24 saat.

### 2.3 Diger Tablolar

- **`vote_changes`** — Oy degistirme gecmisi (vote_id, old_party, new_party)
- **`device_logs`** — Cihaz/IP takibi (fingerprint, ip_address, user_agent)
- **`admins`** — Admin hesaplari (email, password_hash, is_active)
- **`admin_settings`** — Sistem ayarlari (AES-256-GCM ile sifreli, setting_key + encrypted_value)
- **`admin_audit_logs`** — Admin islem denetim izi
- **`published_reports`** — Yayinlanmis tur raporlari (slug, title, report_data JSONB)
- **`city_voter_counts`** — Sehir bazli secmen sayilari (YSK verisi)

---

## 3. Agirliklandirma Motoru

### 3.1 Genel Mimari

Motor `src/lib/weighting/engine.ts` dosyasinda yer alir. Uc ana fonksiyon export eder:

```
computeWeightedResults(roundId?) → WeightedResults   (ulusal sonuclar)
computeCityWeightedResults()     → Map<city, result>  (il bazli, harita icin)
getVoteWeightMap()               → Map<userId, weight> (ilce API icin)
```

### 3.2 Pipeline Sirasi

```
1. weighting_configs tablosundan konfigurasyonu yukle
2. reference_demographics tablosundan referans verileri yukle
3. Tum gecerli oylari users JOIN ile cek (tek sorgu)
4. Her kullanıcı icin agirlik faktorlerini hesapla:
   a. Demografik (Raking VEYA Post-Strat, ikisi birden degil)
   b. Katılım Niyeti
   c. Zaman Agirligi
   d. Partizan Sapma
   e. Bolgesel Kota
   f. Sahtecılik Cezası
5. Faktorleri carp → birlesik agirlik
6. Weight cap uygula (min=0.4, max=2.5)
7. Agirlikli parti dagilimini hesapla
8. Efektif orneklem buyuklugu: (Sumw)^2 / Sum(w^2) [Kish formulu]
9. Guven skoru hesapla
10. Cache'e yaz
```

**Birlesik agirlik formulu:**
```
combined = demographic × turnout × recency × fraudPenalty × partisanBias × regionalQuota
combined = max(0.4, min(2.5, combined))
```

### 3.3 Agirliklandirma Yontemleri (Detayli)

#### 3.3.1 Raking (Iterative Proportional Fitting) — AKTIF
**Dosya:** `src/lib/weighting/raking.ts`

Cok boyutlu demografik dengeleme. Orneklem dagilimini referans nufus dagilimlarina yaklastirir.

**Boyutlar:** age, gender, education, region (4 boyut)

**Algoritma:**
1. Tum agirliklari 1 olarak baslat
2. Her boyut icin:
   - Mevcut agirlikli orneklem dagilimini hesapla
   - Referans dagilimdaki hedef oranlarla karsilastir
   - Duzeltme carpani = hedef_oran / orneklem_orani
   - Tum oylar icin carpani uygula
3. Yakinsama: max duzeltme < 0.001 olana kadar tekrarla (max 50 iterasyon)

**Ornek:** Orneklemde erkekler %60, TUIK'te %50.2 ise → erkek agirligi × (0.502/0.60) = × 0.837

**NOT:** Raking aktifken Post-Stratification otomatik devre disi kalir (engine'de `else if`).

#### 3.3.2 Katilim Niyeti (Turnout Weighting) — AKTIF
**Dosya:** `src/lib/weighting/turnout.ts`

Kullanıcının "secime katilacak misiniz?" cevabina gore agirlik.

| Kategori | Kod | Agirlik |
|----------|-----|---------|
| Kesin katilacagim | T1 | 1.0 |
| Buyuk ihtimalle | T2 | 0.6 |
| Belki | T3 | 0.3 |
| Katilmayacagim | T4 | 0.25 |

**NOT:** Bilgisi olmayan kullanıcılar icin agirlik = 1 (notr). T4=0.25 secilmistir, 0 degil — tamamen sifirlamak yerine minimal etki birakilir.

#### 3.3.3 Zaman Agirligi (Recency Weighting) — AKTIF
**Dosya:** `src/lib/weighting/recency.ts`

Eski oylar zamanla deger kaybeder.

**Formul:** `agirlik = e^(-lambda × gun_sayisi)`

**Parametreler:** lambda = 0.01

**Pratik etkiler:**
- 7 gun once → %93 agirlik
- 30 gun once → %74 agirlik
- 60 gun once → %55 agirlik
- 90 gun once → %41 agirlik

#### 3.3.4 Partizan Sapma Duzeltmesi — AKTIF
**Dosya:** `src/lib/weighting/partisan-bias.ts`

Kullanıcıların beyan ettigi 2023 oy tercihleri ile YSK gercek sonuclarini karsilastirir.

**Algoritma:**
1. Orneklemdeki 2023 oy dagilimini hesapla
2. YSK 2023 gercek sonuclariyla karsilastir
3. Ham duzeltme = ysk_orani / orneklem_orani
4. **Damping (yumusatma) uygulanir:** `dampened = 1 + 0.5 × (ham - 1)`

**Damping Ornegi:**
- Ham duzeltme 1.8x → dampened 1.4x
- Ham duzeltme 0.6x → dampened 0.8x
- Ham duzeltme 1.0x → dampened 1.0x (degisiklik yok)

**NOT:** 2023 oyu beyan etmemis kullanıcılar icin agirlik = 1 (notr).

#### 3.3.5 Sahtecilik Tespiti — AKTIF
**Dosya:** `src/lib/fraud/scorer.ts`

Puan bazli sistem (0-100):

| Faktor | Puan |
|--------|------|
| IP /24 subnet: 3+ kullanıcı | 10-25 |
| VPN/Datacenter IP | 20 |
| Hesap yasi < 1 saat | 10 |
| Bos profil | 5 |
| Supheli user-agent | 15 |

**NOT:** Tek kullanimlik email ve ardisik email kontrolu artik devre disi — email bilgisi veritabaninda saklanmiyor (Firebase Auth gecisi sonrasi).

**Esik: 80**
- Puan >= 80 → agirlik = 0 (oy tamamen sayilmaz)
- Puan < 80 → agirlik = max(0, 1 - puan/100) (kademeli dusus)

#### 3.3.6 Weight Cap — AKTIF
Birlesik agirligin minimum ve maksimum sinirlari.
- **Minimum:** 0.4 (hicbir oy %40'in altina dusmez)
- **Maksimum:** 2.5 (hicbir oy 2.5 kattan fazla sayilmaz)

#### 3.3.7 Bolgesel Kota — DEVRE DISI
**Dosya:** `src/lib/weighting/regional-quota.ts`

Raking zaten `region` boyutunu icerdigi icin devre disi. Ayri olarak acilinsa double-dipping olur.

#### 3.3.8 Post-Stratification — DEVRE DISI
**Dosya:** `src/lib/weighting/post-stratification.ts`

Raking aktifken otomatik devre disi. Tek boyutlu duzeltme yapar (raking cok boyutlu).

#### 3.3.9 Bayesian Duzeltme — IMPLEMENTE EDILMEMIS
**Dosya:** `src/lib/weighting/bayesian.ts` (dosya var ama engine'de cagrilmiyor)

Engine pipeline'inda bayesian adimi yok. Admin toggle'i acilsa bile hicbir etkisi olmaz. Kucuk orneklem duzeltmesi su an "sample-size blending" ile harita API'lerinde uygulanmaktadir.

### 3.4 Sample-Size Blending (Orneklem Buyuklugu Harmanlama)

Kucuk orneklemli il/ilcelerde agirlikli sonuclar asiri sapabilir. Bu sorunu cozmek icin ham ve agirlikli sonuclar harmanlanir:

```
confidence = min(orneklem_sayisi / esik, 1.0)
blendedPct = rawPct × (1 - confidence) + weightedPct × confidence
```

**Esik Degerleri:**
- Il bazli (cities API): **50 oy**
- Ilce bazli (districts API): **30 oy**

**Ornek:** Bir ilde 25 oy varsa → confidence = 25/50 = 0.5 → sonuc %50 ham, %50 agirlikli.

### 3.5 Beraberlik Cozumu (Tiebreaker)

Iki parti esit yuzdeye sahipse, 2023 secim sonuclarina gore siralama yapilir:
- Il bazli: `city_election_results_2023` tablosu
- Ulusal: genel siralama

### 3.6 Guven Skoru
**Dosya:** `src/lib/weighting/confidence.ts`

| Faktor | Agirlik | Hesaplama |
|--------|---------|-----------|
| Orneklem Buyuklugu | %30 | sqrt(n), 10000'de 100'e ulasir |
| Demografik Denge | %30 | Orneklem vs TUIK sapma (chi-squared benzeri) |
| Cografi Kapsam | %20 | Oy gelen il sayisi / 81 |
| Sahtecılik Oranı | %20 | 100 - (flagged/total × 200) |

**Hata Payi:** `1.96 × sqrt(p × (1-p) / n_eff) × 100` (%95 guven araligi)

### 3.7 Cache Mekanizmasi
**Dosya:** `src/lib/weighting/cache.ts`

- `weighted_results_cache` tablosunu kullanir
- Cache key: `national`, `city-map` vb.
- Aktif turlar: **5 dk TTL**
- Kapali turlar: **24 saat TTL**
- Admin config degistiginde cache invalidate olur

---

## 4. API Yapisi

### 4.1 Public API'ler

| Endpoint | Metod | Aciklama |
|----------|-------|----------|
| `/api/results/live-count` | GET | Ham parti sonuclari, toplam oy, tur bilgisi. `?weighted=true` ile agirlikli sonuclar da gelir |
| `/api/results/weighted` | GET | Agirlikli sonuclar. `?scope=national` veya `?scope=city&city=X` |
| `/api/results/demographics` | GET | Demografik kirilim (yas, cinsiyet, egitim, gelir, katilim). `?type=age` vb. **HAM VERI** |
| `/api/map/cities` | GET | Harita verisi. `?showPartyColors=true` ile agirlikli renklendirme |
| `/api/map/districts` | GET | Ilce verisi. `?city=X` ile belirli il |
| `/api/transparency` | GET | Seffaflik raporu: toplam oy, gecersiz, supheli, aktif yontemler |
| `/api/leaderboard` | GET | Katilim siralamasi (il bazli) |
| `/api/parties` | GET | Parti listesi |
| `/api/reports` | GET | Yayinlanmis raporlar |
| `/api/reports/[slug]` | GET | Tekil rapor |
| `/api/transactions` | GET | Islem gecmisi |

### 4.2 Auth API'ler

| Endpoint | Metod | Aciklama |
|----------|-------|----------|
| `/api/auth/firebase` | POST | Firebase auth (login + register birlesik) |
| `/api/auth/check-email` | POST | E-posta varlik kontrolu (Admin SDK getUserByEmail) |
| `/api/auth/config` | GET | Aktif auth yontemi (email/phone) |
| `/api/vote` | POST | Oy kullanma/degistirme |
| `/api/user/profile` | GET/PATCH/DELETE | Profil bilgileri |
| `/api/user/vote-history` | GET | Oy gecmisi |
| `/api/user/stats` | GET | Kullanıcı istatistikleri |
| `/api/user/referrals` | GET | Referans bilgileri |

### 4.3 Admin API'ler

Tumu `/api/admin/` altinda, JWT admin auth gerektirir.

| Endpoint | Metod | Aciklama |
|----------|-------|----------|
| `/api/admin/auth/login` | POST | Admin girisi |
| `/api/admin/auth/me` | GET | Oturum kontrolu |
| `/api/admin/dashboard/stats` | GET | Dashboard istatistikleri |
| `/api/admin/dashboard/charts` | GET | Grafik verileri |
| `/api/admin/users` | GET | Kullanıcı listesi |
| `/api/admin/users/[id]` | GET/PATCH/DELETE | Kullanıcı detay |
| `/api/admin/votes` | GET | Oy listesi |
| `/api/admin/votes/[id]` | PATCH/DELETE | Oy yonetimi |
| `/api/admin/rounds` | GET/POST | Tur listesi/olusturma |
| `/api/admin/rounds/[id]` | GET/PATCH | Tur detay/guncelleme |
| `/api/admin/parties` | GET/POST | Parti yonetimi |
| `/api/admin/parties/[id]` | PATCH/DELETE | Parti detay |
| `/api/admin/weighting` | GET/PUT | Agirliklandirma config |
| `/api/admin/weighting/preview` | POST | Onizleme |
| `/api/admin/reference-data` | GET/PUT | Referans veri CRUD |
| `/api/admin/fraud` | POST | Toplu fraud score yeniden hesaplama |
| `/api/admin/voter-counts` | GET | Secmen sayilari |
| `/api/admin/settings` | GET/PUT | Sistem ayarlari (auth yontemi vb.) |
| `/api/admin/audit-log` | GET | Admin islem kayitlari |

### 4.4 Veri Akisi: Oy → Sonuc

```
Kullanıcı oyu    →  votes tablosu (ham)
                          ↓
Engine pipeline   →  agirlikli sonuclar hesapla
                          ↓
Cache             →  weighted_results_cache
                          ↓
API'ler           →  live-count, weighted, map/cities, map/districts, transparency
                          ↓
Frontend          →  PartyBars, TurkeyMap, CityTooltip, TransparencyReport
```

---

## 5. Frontend Yapisi

### 5.1 Sayfalar

| Sayfa | Dosya | Aciklama |
|-------|-------|----------|
| Ana Sayfa | `src/app/page.tsx` | Sonuclar, harita, grafıkler, seffaflik raporu |
| Profil | `src/app/profil/page.tsx` | Kullanıcı bilgileri, demografik form |
| Metodoloji | `src/app/metodoloji/page.tsx` | Acik metodoloji sayfasi |
| Raporlar | `src/app/raporlar/page.tsx` | Yayinlanmis tur raporlari listesi |
| Rapor Detay | `src/app/raporlar/[slug]/page.tsx` | Tekil rapor |
| Islemler | `src/app/islemler/page.tsx` | Islem gecmisi |

### 5.2 Ana Sayfa Bileşenleri ve Veri Akisi

```
page.tsx
├── Header — toplam oy sayaci, kalan gun, oy kullan butonu
├── TurkeyMap — interaktif harita
│   ├── CityTooltip — hover bilgisi (login: %, misafir: sayi)
│   ├── CityDetailModal — il detay (ilce kirilimi)
│   └── DistrictMap — ilce haritasi (SVG)
├── PartyBars — parti sonuc cubuklari (ham/agirlikli toggle)
│   └── PartyDetailModal — parti detay (agirliklandirma etkisi)
├── ConfidenceIndicator — guven skoru gostergesi
├── DemographicComparison — demografik kirilim grafikleri
├── CityTable — il bazli siralama tablosu
├── ParticipationLeaderboard — katilim siralamasi
├── TransparencyReport — seffaflik raporu
└── VoteModal — oy kullanma akisi
    ├── FirebaseAuthForm — Firebase giris/kayit (email veya SMS)
    ├── ProfileForm — yeni kullanici il/ilce secimi
    ├── PartyGrid — parti secimi
    └── DemographicForm — demografik bilgi toplama
```

### 5.3 Ana Sayfa Veri Cekme

`fetchData()` fonksiyonu paralel olarak su API'leri ceker:
1. `/api/results/live-count` → parti sonuclari, tur bilgisi
2. `/api/map/cities` → harita verisi
3. `/api/transparency` → seffaflik raporu
4. `/api/leaderboard` → katilim siralamasi
5. `/api/parties` → parti renk/isim lookup
6. `/api/results/weighted?scope=national` → agirlikli sonuclar

**Yenileme:** Her 30 saniyede otomatik.

### 5.4 Ham vs Agirlikli Toggle

Ana sayfada iki sekme: "Ham Sonuclar" | "Agirlikli Sonuclar" (default: agirlikli)

- **Ham:** `live-count` API'sinden gelen ham yuzdelik
- **Agirlikli:** `weighted` API'sinden gelen agirlikli yuzdelik
- Her partide **delta gostergesi:** "+1.2" veya "-0.8" puan fark

### 5.5 Seffaflik Raporu → Islemler Entegrasyonu

TransparencyReport bileseni ana sayfada gosterilir. Tiklanabilir ogeleri:

| Oge | Link | Aciklama |
|-----|------|----------|
| "Toplam Oy" stat karti | `/islemler?type=OY_KULLANIM` | Oy islemleri filtrelenmis |
| "Supheli Hesap" stat karti | `/islemler?status=flagged` | Supheli hesaplarin islemleri |
| "Gecersiz Oy" stat karti | `/islemler?status=invalid` | Gecersiz oylar filtrelenmis |
| Parti badge (orn. "CHP (43)") | `/islemler?status=invalid&party=CHP` | O partinin gecersiz oylari |

Islemler sayfasi URL query parametreleri:
- `type` — OY_KULLANIM, OY_DEGISIKLIK, OY_DEVIR, KAYIT
- `status` — invalid (gecersiz oylar), flagged (supheli hesaplar)
- `party` — parti short_name ile filtreleme
- `city` — il bazli filtreleme

### 5.6 Harita Entegrasyonu

- **Oy kullanmamis:** Katilim haritasi (renksiz, oy sayisi)
- **Oy kullanmis:** Parti renkleri haritasi (agirlikli sonuca gore)
- **Tooltip (login):** Yuzde gosterir (agirlikli, %'den yuksege sirali)
- **Tooltip (misafir):** Ham oy sayisi gosterir
- **Sample-size blending:** Kucuk orneklemli illerde ham sonuca yakin, buyuk illerde agirlikli

---

## 6. Admin Paneli

### 6.1 Sayfalar

| Sayfa | URL | Aciklama |
|-------|-----|----------|
| Dashboard | `/admin` | Genel istatistikler, grafikler |
| Kullanıcılar | `/admin/users` | Kullanıcı listesi, filtreleme, supheli isaretleme |
| Kullanıcı Detay | `/admin/users/[id]` | Tekil kullanıcı, demografik bilgiler, oylar |
| Oylar | `/admin/votes` | Tum oylar, filtreleme, gecersiz kilma |
| Turlar | `/admin/rounds` | Tur listesi, yeni tur olusturma |
| Tur Detay | `/admin/rounds/[id]` | Sonuc yayinlama, rapor olusturma |
| Partiler | `/admin/parties` | Parti CRUD |
| Agirliklandirma | `/admin/weighting` | 9 yontem toggle + parametreler |
| Referans Veriler | `/admin/reference-data` | TUIK/YSK referans veri duzenleme |
| Secmen Sayilari | `/admin/voter-counts` | Il bazli secmen sayilari |
| Ayarlar | `/admin/settings` | Auth yontemi secimi, Firebase durumu |
| Denetim Kayitlari | `/admin/audit-log` | Admin islem gecmisi |

### 6.2 Agirliklandirma Sayfasi

Katlanabilir bolumler, her biri toggle + parametre alanlari:

1. **Raking (IPF)** — toggle, boyut secimi (yas/cinsiyet/egitim/bolge), max iterasyon, yakinsama esigi
2. **Post-Stratification** — toggle, boyut secimi (NOT: raking aktifse devre disi)
3. **Bolgesel Kota** — toggle (NOT: raking region iceriyorsa gereksiz)
4. **Katilim Niyeti** — toggle, T1-T4 agirlik girisleri
5. **Zaman Agirligi** — toggle, lambda slider
6. **Bayesian Duzeltme** — toggle (NOT: engine'de implemente degil)
7. **Partizan Sapma** — toggle
8. **Sahtecilik Tespiti** — toggle, esik slider
9. **Agirlik Siniri** — min/max girisleri

**"Onizleme" butonu:** Konfigurasyonu kaydetmeden sonuclari simule eder.

---

## 7. Coğrafi Yapi

### 7.1 Bolge Haritasi
**Dosya:** `src/lib/geo/regions.ts`

81 il → 7 bolge eslemesi:

| Bolge | Iller (ornek) |
|-------|--------------|
| marmara | Istanbul, Bursa, Kocaeli, Tekirdag... |
| ic_anadolu | Ankara, Konya, Eskisehir, Kayseri... |
| ege | Izmir, Aydin, Denizli, Mugla... |
| akdeniz | Antalya, Adana, Mersin, Hatay... |
| karadeniz | Trabzon, Samsun, Rize, Ordu... |
| guneydogu_anadolu | Diyarbakir, Gaziantep, Sanliurfa... |
| dogu_anadolu | Erzurum, Van, Elazig, Malatya... |

**Fonksiyon:** `getCityRegion(city: string): string`

### 7.2 Ilce Verileri
**Dosya:** `src/lib/geo/city-districts.ts`

81 ilin tum ilceleri. Ilce bazli sonuc hesaplama ve harita icin.

### 7.3 Harita Gorsellestime
**Dosya:** `src/lib/geo/turkey-data.ts`

Turkiye GeoJSON / TopoJSON verisi. `react-simple-maps` ile render edilir.

---

## 8. Kimlik Dogrulama

### 8.1 Kullanıcı Auth — Firebase Authentication
- **Saglayici:** Firebase Authentication (email/sifre + telefon/SMS)
- **Yontem secimi:** Admin panelden (`/admin/settings`) email veya SMS arasinda degistirilebilir
- **Client SDK:** `src/lib/firebase/config.ts` — Firebase client config (public, hardcoded)
- **Admin SDK:** `src/lib/firebase/admin.ts` — Firebase Admin SDK (token dogrulama)
- **Auth form:** `src/components/auth/FirebaseAuthForm.tsx` — email/phone UI
- **Profil formu:** `src/components/vote/ProfileForm.tsx` — yeni kullanici icin il/ilce secimi

**Akis (Email):**
1. Kullanici e-posta adresini girer
2. `/api/auth/check-email` endpoint'i Admin SDK `getUserByEmail()` ile kontrol eder
3. Mevcut kullanici → "Giris Yap" ekrani (sifre iste)
4. Yeni kullanici → "Kayit Ol" ekrani (sifre belirle) — sadece VoteModal'dan, Header'dan DEGIL
5. Firebase ile giris/kayit yapilir, ID Token alinir
6. Yeni kayitlarda `sendEmailVerification` ile dogrulama maili gonderilir
7. `/api/auth/firebase` endpoint'ine token gonderilir
8. Sunucu Firebase Admin SDK ile token'i dogrular
9. `firebase_uid` ile DB'de kullanici aranir
10. Varsa → login (JWT verilir, identity_hash yoksa backfill edilir), yoksa → yeni kullanici olusturulur

**loginOnly Modu:** Header'daki giris formu `loginOnly=true` ile calisir. Kayitli olmayan e-posta girilirse "Kayit olmak icin Oy Ver butonunu kullanin" mesaji gosterilir.

**E-posta Dogrulama:** Custom action URL (`/auth/action`) kullanilir. Firebase varsayilan sayfasi yerine kendi Turkce dogrulama sayfamiz acilir. `auth.languageCode = 'tr'` ile Firebase mailleri Turkce gonderilir.

**Sifir PII Felsefesi:**
- Veritabaninda email, telefon, isim, sifre SAKLANMAZ
- Sadece `firebase_uid` tutulur — Firebase'deki kimlikle baglanti
- DB dump alinsa bile kimlik tespiti MUMKUN DEGILDIR
- Kullanici kimligini oy tercihi ile eslestirmek mumkun degildir

**Onemli:** Auth yontemi admin panelden degistirilebilir. SMS yontemi Firebase Phone Verification onayi gerektirir (Google'dan onay).

### 8.2 Admin Auth
- Ayri JWT, `src/lib/auth/admin-jwt.ts`
- Ayri `admins` tablosu (email + password_hash)
- Middleware: `src/lib/auth/admin-middleware.ts`
- Admin auth Firebase KULLANMAZ — kendi email/sifre sistemi

### 8.3 Guvenlik Onlemleri
- Hesap basi max oy degistirme: **2** (MAX_VOTE_CHANGES)
- Minimum hesap yasi: **24 saat** (MIN_ACCOUNT_AGE_HOURS)
- IP basina max kayit: **5** (MAX_REGISTRATIONS_PER_IP)
- IP rate limit penceresi: **15 dk**
- Parmak izi takibi: FingerprintJS
- Device log: Her oylama ve giriste kaydedilir

---

## 9. Sabit Degerler
**Dosya:** `src/lib/constants.ts`

### Demografik Kategoriler

**Yas (AGE_BRACKETS):**
| Kod | Aralık |
|-----|--------|
| Y1 | 18-24 |
| Y2 | 25-34 |
| Y3 | 35-44 |
| Y4 | 45-54 |
| Y5 | 55-64 |
| Y6 | 65+ |

**Gelir (INCOME_BRACKETS):**
| Kod | Aralık |
|-----|--------|
| G1 | 0 - 17.000 TL |
| G2 | 17.001 - 30.000 TL |
| G3 | 30.001 - 50.000 TL |
| G4 | 50.001 - 80.000 TL |
| G5 | 80.001 - 150.000 TL |
| G6 | 150.001 TL+ |

**Cinsiyet (GENDER_OPTIONS):** E (Erkek), K (Kadin)

**Egitim (EDUCATION_BRACKETS):**
| Kod | Seviye |
|-----|--------|
| E1 | Ilkokul veya alti |
| E2 | Ortaokul |
| E3 | Lise |
| E4 | Universite (Lisans) |
| E5 | Lisansustu |

**Katilim Niyeti (TURNOUT_OPTIONS):**
| Kod | Cevap |
|-----|-------|
| T1 | Kesin katilacagim |
| T2 | Buyuk ihtimalle |
| T3 | Belki |
| T4 | Katilmayacagim |

---

## 10. Veri Notlari

### 10.1 Sentetik Veri
- Sistemde ~2766/2767 oy sentetik (seed scriptleri ile olusturulmus)
- `is_dummy = true` olarak isaretli
- Agirliklandirma bunlari ayirt etmez — gercek oy gibi islenir
- Gercek kullanıcı sayisi artinca sentetik verilerin etkisi azalir

### 10.2 Kararsiz Oylar
- `party = 'karasizim'` olan oylar sonuclara dahil edilmez
- Oy kullanilmis sayilir (kullanıcı harita renklerini gorur)
- Parti dagilimi hesaplarindan cikarilir

### 10.3 Oy Tasima (Carry-over)
- Yeni tur basladiginda onceki turun oylari tasinabilir
- `is_carried_over = true` olarak isaretlenir
- Kullanıcı yeni turda oy kullanmadiysa eski oyu gecerli kalir

---

## 11. Deployment

### Gereksinimler
- Node.js 20+
- PostgreSQL 15+
- PM2 (production process manager)

### Deploy Adimlari
```bash
git pull
npm install
npm run build
pm2 reload <app-name>
```

### DB Migration
```bash
npx drizzle-kit push
```

---

## 12. Dosya Yapisi

```
src/
├── app/
│   ├── page.tsx                          — Ana sayfa (client component)
│   ├── layout.tsx                        — Root layout
│   ├── globals.css                       — Global stiller
│   ├── metodoloji/page.tsx               — Metodoloji sayfasi
│   ├── profil/page.tsx                   — Kullanıcı profili
│   ├── islemler/page.tsx                 — Islem gecmisi
│   ├── auth/action/page.tsx              — Firebase e-posta dogrulama sayfasi (Turkce)
│   ├── raporlar/
│   │   ├── page.tsx                      — Rapor listesi
│   │   └── [slug]/page.tsx               — Rapor detay
│   ├── admin/
│   │   ├── login/page.tsx                — Admin giris
│   │   └── (dashboard)/
│   │       ├── layout.tsx                — Admin layout (sidebar)
│   │       ├── page.tsx                  — Admin dashboard
│   │       ├── users/page.tsx            — Kullanıcı yonetimi
│   │       ├── users/[id]/page.tsx       — Kullanıcı detay
│   │       ├── votes/page.tsx            — Oy yonetimi
│   │       ├── rounds/page.tsx           — Tur yonetimi
│   │       ├── rounds/new/page.tsx       — Yeni tur
│   │       ├── rounds/[id]/page.tsx      — Tur detay
│   │       ├── parties/page.tsx          — Parti yonetimi
│   │       ├── weighting/page.tsx        — Agirliklandirma config
│   │       ├── reference-data/page.tsx   — Referans veriler
│   │       ├── voter-counts/page.tsx     — Secmen sayilari
│   │       ├── settings/page.tsx         — Ayarlar (auth yontemi, Firebase durumu)
│   │       └── audit-log/page.tsx        — Denetim kayitlari
│   └── api/                              — (API route'lar, bolum 4'te detayli)
├── components/
│   ├── admin/layout/                     — AdminSidebar, AdminTopbar
│   ├── auth/                             — FirebaseAuthForm (email/phone auth UI)
│   ├── layout/                           — Header, PageHero
│   ├── map/                              — TurkeyMap, CityTooltip, CityDetailModal, DistrictMap
│   ├── results/                          — PartyBars, PartyDetailModal, TransparencyReport, vb.
│   ├── ui/                               — Confetti, Counter, ProgressBar, SearchableSelect
│   └── vote/                             — VoteModal, PartyGrid, DemographicForm, ProfileForm
├── hooks/
│   └── useFingerprint.ts                 — FingerprintJS hook
├── lib/
│   ├── auth/                             — JWT, middleware, password (admin), AuthContext
│   ├── firebase/                         — config.ts (client SDK), admin.ts (Admin SDK)
│   ├── db/                               — Drizzle config, schema, migrations
│   ├── fraud/                            — scorer, vpn-detection, disposable-emails
│   ├── geo/                              — regions, city-districts, turkey-data
│   ├── weighting/                        — engine, raking, turnout, recency, vb.
│   ├── admin/                            — audit, hooks, settings (sifreleme ile)
│   ├── constants.ts                      — Sabit degerler
│   ├── parties.ts                        — Parti renk/isim lookup
│   ├── city-populations.ts               — Il nufuslari
│   └── ui.ts                             — UI yardimcilari
├── types/
│   └── index.ts                          — Global tip tanimlari
scripts/
├── seed-reference-data.ts                — TUIK/YSK referans veri seed
├── seed-dummy-votes.ts                   — Sentetik oy olusturma
├── seed-february-2026.ts                 — Subat 2026 veri seed
├── seed-voter-counts.sql                 — Secmen sayilari SQL
├── seed-city-election-2023.sql           — 2023 secim sonuclari SQL
├── publish-march-report.ts               — Mart raporu yayinlama
├── update-parties-and-enable-weighting.ts— Parti guncelleme + agirliklandirma
├── update-karasizim.ts                   — Kararsiz parti guncelleme
├── carry-over-votes.js                   — Oy tasima
├── add-vote-changes.js                   — Oy degisimi ekleme
└── add-feb-carryover.js                  — Subat oy tasima
```

---

## 13. Bilinen Sinirlamalar ve Gelecek Calisma

### Aktif Sinirlamalar
1. **Bayesian Duzeltme:** Engine'de implemente degil. Admin toggle'i acilsa bile etkisiz.
2. **Gelir Boyutu:** Kullanıcılardan toplanir ama referans veri olmadigi icin agirliklandirmada kullanilmaz.
3. **Demographics API:** Ham veri gosterir, agirliklandirma uygulanmaz (bu dogru yaklasimdir — demografik kirilim ham olmalidir).
4. **Sentetik Veri:** ~2766 sentetik oy mevcut. Gercek kullanıcı sayisi artinca doguracagi sapma azalir.
5. **Tek Tur:** Su an tek aktif tur desteklenir. Coklu aktif tur senaryosu test edilmemis.

### Potansiyel Iyilestirmeler
1. Bayesian smoothing'i kucuk iller icin implemente et
2. Gelir boyutu icin TUIK referans verisi ekle veya gelir toplama formunu kaldir
3. WebSocket ile gercek zamanli sonuc guncellemesi
4. A/B test altyapisi (farkli agirliklandirma konfigurasyonlarini karsilastirma)
5. Tarihsel trend grafikleri (turlar arasi karsilastirma)

---

## 14. Ortam Degiskenleri

```env
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET=...
SETTINGS_ENCRYPTION_KEY=...          # AES-256-GCM, admin ayarlari sifrelemesi
FIREBASE_SERVICE_ACCOUNT=...         # (opsiyonel) Firebase Admin SDK service account JSON
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**NOT:** Firebase client config (apiKey, projectId vb.) `src/lib/firebase/config.ts` dosyasinda tutulur — bu public bilgidir ve env variable gerektirmez. Kendi Firebase projenizin config degerlerini girmeniz gerekir.

---

## 15. Denetim Gecmisi

### Mart 2026 Duzeltmeleri

1. **Kastamonu DEM sorunu cozuldu:** 5 birlesik agirliklandirma hatasi (T4=0, bolgesel kota double-dipping, income boyutu veri yok, weight cap cok genis, kucuk orneklem sapmasi)
2. **Harita agirliklandirma motora baglandi:** Hem il hem ilce duzeyi
3. **Sample-size blending eklendi:** Kucuk orneklemlerde ham/agirlikli harmanlama
4. **Districts API refactor:** 150 satirlik inline hesaplama → `getVoteWeightMap()` tek fonksiyon
5. **Transparency API duzeltildi:** DB `is_enabled=true` yerine engine'in gercek `methodology` ciktisi
6. **PartyDetailModal metni duzeltildi:** "gelir" referansi cikarildi
7. **Admin panel uyumsuzluklari duzeltildi:**
   - DimensionSelector'dan "income" secenegi cikarildi
   - Turnout formul metni "Hayir=0.0" → "Hayir=0.25"
   - Turnout detay metni guncellendi
   - Bayesian basligina "Henuz Aktif Degil" notu eklendi
   - Engine fallback'lari DB ile uyumlu hale getirildi (T4=0.25, cap min=0.4/max=2.5)
   - Demographics banner'dan `income_bracket` kontrolu cikarildi

### Nisan 2026 Guncellemeleri

1. **Firebase Authentication gecisi:** Tum kimlik dogrulama Firebase Authentication'a tasindi
   - Email/sifre ve telefon/SMS destegi
   - Admin panelden auth yontemi degistirilebilir
   - Sifir PII mimarisi: DB'de email, telefon, isim, sifre SAKLANMAZ
   - Sadece `firebase_uid` tutulur
2. **Infobip tamamen kaldirildi:** Tum Infobip SMS/WhatsApp kodu, env var'lari ve phone/* kutuphaneleri silindi
3. **Eski auth sistemi kaldirildi:** `/api/auth/login`, `/api/auth/register`, `/api/auth/verify-email`, PhoneVerificationForm, RegistrationForm, email.ts, lib/auth/password (admin haric) silindi
4. **DB migration:** users tablosundan email, password_hash, name, phone_hash, phone_verified, email_verified, email_verification_token kolonlari kaldirildi. phone_otps ve phone_registry tablolari silindi
5. **Yeni endpoint'ler:** `/api/auth/firebase` (birlesik login+register), `/api/auth/config` (aktif auth yontemi)
6. **Admin panel:** Ayarlar sayfasi eklendi (auth yontemi toggle, Firebase durumu)
7. **Login olmayan kullanicilar:** Profil sayfasina erisim engellendi, toolbar'da "Sonuclari gormek icin Oy Ver" gosteriliyor, detay modallari/demografik veriler gizleniyor
8. **Microsoft Clarity SDK:** Analytics icin eklendi (ID: w4w5bylwe5)
9. **Fraud scorer guncellendi:** Disposable email ve sequential email kontrolleri devre disi (email bilgisi artik DB'de yok)
10. **identity_hash eklendi:** Email/telefon SHA256 hash'i ile kullanicilar PII olmadan tanimlanir. Kayit sirasinda olusturulur, eski kullanicilara login'de backfill yapilir
11. **E-posta akisi ayrildi:** Login ve register adimlari ayrildi. Once e-posta sorulur, `/api/auth/check-email` ile kontrol edilir, mevcutsa "Giris Yap", yoksa "Kayit Ol" ekrani gosterilir
12. **loginOnly modu:** Header giris formu sadece giris yapar, kayit olusturamaz. Kayit sadece "Oy Ver" akisindan yapilabilir
13. **E-posta dogrulama:** Custom action URL (`/auth/action`), Turkce mail, Firebase Console'da dil ve action URL ayarlari
14. **Admin kullanici silme:** Firebase hesabi + DB kayitlari (votes, voteChanges, deviceLogs, fraudScores, referred_by) tek islemde silinir
15. **Admin panelde dummy filtresi:** Kullanicilar Gercek/Sentetik olarak filtrelenebilir, varsayilan olarak gercek kullanicilar gosterilir
16. **Timezone duzeltmesi:** Admin paneldeki tum tarih gosterimleri `timeZone: 'UTC'` ile formatlanir (PG Europe/Berlin timezone kaynaklı offset sorunu)
17. **Fingerprint fraud fix:** Dummy/migration kullanicilar fraud detection'dan haric tutulur
18. **Oy gecerliligi fix:** Flaglenen yeni kullanicinin oyu `is_valid: false` olarak kaydedilir
19. **Uyelik suresi fix:** Negatif gun sayisi engellendi (`Math.max(0, ...)`)
20. **DNS kayitlari:** Firebase e-posta dogrulama icin SPF, DKIM, Firebase TXT kayitlari Cloudflare'e eklendi
