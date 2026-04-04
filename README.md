# #MilletNeDer

Turkiye'nin 81 ilini kapsayan, aylik turlarda calisan acik kaynakli online secim anketi platformu.

**Temel Prensip:** Seffaflik. Tum metodolojiler, parametreler ve hesaplama yontemleri acik sekilde yayinlanir.

## Ozellikler

### Oy Sistemi
- Aylik turlarla calisan cok partili anket sistemi
- Oy degistirme ve turlar arasi oy tasima
- Kararsiz (karasizim) secenegi ve oransal dagitim
- Oy sifreleme (AES-256, versiyon destegi)
- Kurtarma kodlari ile hesap kurtarma (PBKDF2)

### Agirliklandirma Motoru
8+ yapilandirilabilir agirliklandirma yontemi:
- **Post-stratifikasyon:** TUIK nufus verileriyle demografik duzeltme
- **Raking (IPF):** Cok boyutlu yinelemeli orantili uydurma
- **Bolgesel kota:** 7 cografi bolge icin YSK secmen dagilimina gore dengeleme
- **Katilim niyeti:** Oy kullanma olasiligina gore ayarlama
- **Guncellik:** Yeni oylari onde tutan ustel azalma
- **Bayesian duzeltme:** Kucuk orneklemleri ulusal ortalamaya cekme
- **Partizan sapma:** 2023 secim sonuclariyla duzeltme
- **Sahteclik skoru:** Agirliklandirma faktoru olarak dahil etme

### Sahteclik Tespiti
- Cok faktorlu skor sistemi (0-100): IP kumeleme, VPN/datacenter tespiti, hesap yasi, tek kullanimlik e-posta engelleme, bos profil tespiti, supheli tarayici analizi
- Cihaz parmak izi ile coklu hesap tespiti
- Esik degerine gore oy gecersiz kilma veya agirlik dusurme

### Harita ve Gorsellestirme
- Interaktif Turkiye haritasi (il / ilce / bolge gorunum modlari)
- Il detay modali ile parti dagilimi
- Ilce bazinda detaylandirma
- Ham ve agirlikli veri modlari arasi gecis

### Sonuclar ve Analitik
- Canli oy sayimi
- Parti cubuk grafikleri (ham vs agirlikli)
- Il karsilastirma tablolari
- Katilim siralamasi (illerin temsil orani)
- Demografik kirilim grafikleri (yas, cinsiyet, egitim, katilim niyeti)
- Guven gostergesi (orneklem buyuklugu, hata payi)
- Seffaflik raporu (veri kalitesi metrikleri)

### Kimlik Dogrulama ve Gizlilik
- Firebase Authentication (e-posta/sifre + telefon/SMS)
- **Sifir PII mimarisi** — veritabaninda e-posta, telefon, isim, sifre saklanmaz
- Sadece `firebase_uid` ve `identity_hash` (SHA256) tutulur
- Referans sistemi ve rozet kademeleri

### Admin Paneli
- Istatistik dashboard (kullanici, oy, supheli hesap grafikleri)
- Kullanici yonetimi (listeleme, detay, flag/unflag, silme)
- Oy inceleme ve filtreleme
- Tur yonetimi (olusturma, duzenleme, detay)
- Parti yonetimi (CRUD, logo, renk, siralama)
- Agirliklandirma konfigurasyonu
- Referans veri duzenleme (TUIK, YSK verileri)
- Secmen sayilari yonetimi
- Auth loglari ve denetim gecmisi
- Ayarlar (auth yontemi, Firebase durumu)

### Islem Gecmisi
- Tum islemlerin kriptografik hash ile kaydi
- Oy kullanma, oy degistirme, kayit, tasima islemleri
- Coklu filtre ve sayfalama destegi

### Raporlar
- Aylik yayinlanan anket raporlari
- Goruntuleme sayisi takibi

## Teknoloji Yigini

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 15.5 (App Router, TypeScript) |
| UI | Tailwind CSS 4, Framer Motion |
| ORM | Drizzle ORM 0.45 |
| Veritabani | PostgreSQL |
| Harita | react-simple-maps, d3-geo |
| Auth | Firebase Authentication + JWT |
| Parmak Izi | @fingerprintjs/fingerprintjs |
| Dogrulama | Zod |
| E-posta | Nodemailer |

## Kurulum

### Gereksinimler

- Node.js 20+
- PostgreSQL 15+
- Firebase projesi (Authentication etkin)

### Adimlar

```bash
# Repoyu klonla
git clone https://github.com/milletneder/milletneder.git
cd milletneder

# Bagimliliklari yukle
npm install

# Ortam degiskenlerini ayarla
cp .env.example .env.local
# .env.local dosyasini kendi degerlerinle doldur (asagidaki tabloya bak)

# Firebase client config'ini guncelle
# src/lib/firebase/config.ts dosyasinda kendi Firebase projenizin degerlerini girin

# Veritabani migration
npx drizzle-kit push

# Referans verileri yukle (ilk kurulumda)
npx tsx scripts/seed-reference-data.ts
npx tsx scripts/seed-district-data.ts

# Gelistirme sunucusunu baslat
npm run dev
```

Tarayicida [http://localhost:3000](http://localhost:3000) adresini ac.

### Ortam Degiskenleri

| Degisken | Zorunlu | Aciklama |
|----------|---------|----------|
| `DATABASE_URL` | Evet | PostgreSQL baglanti URL'si |
| `JWT_SECRET` | Evet | Kullanici JWT imzalama anahtari |
| `SETTINGS_ENCRYPTION_KEY` | Evet | Admin ayarlari sifrelemesi (AES-256-GCM, 64 hex karakter) |
| `FIREBASE_SERVICE_ACCOUNT` | Evet | Firebase Admin SDK service account JSON |
| `NEXT_PUBLIC_APP_URL` | Evet | Site URL'si (ornek: `https://yourdomain.com`) |

Ornek degerler icin `.env.example` dosyasina bakin.

### Firebase Kurulumu

1. [Firebase Console](https://console.firebase.google.com)'da yeni proje olusturun
2. Authentication > Sign-in method'dan Email/Password ve/veya Phone'u etkinlestirin
3. Project Settings > Service Accounts'tan yeni private key indirin
4. Indirilen JSON'u `FIREBASE_SERVICE_ACCOUNT` env degiskenine koyun
5. `src/lib/firebase/config.ts` dosyasindaki config degerlerini kendi projenizinkilerle degistirin

## Proje Yapisi

```
src/
├── app/                    — Sayfalar ve API route'lari
│   ├── admin/              — Admin paneli sayfalari
│   ├── api/                — REST API endpoint'leri
│   ├── metodoloji/         — Metodoloji sayfasi
│   ├── profil/             — Kullanici profili
│   ├── raporlar/           — Aylik raporlar
│   ├── islemler/           — Islem gecmisi
│   ├── auth/               — Firebase e-posta dogrulama
│   ├── gizlilik/           — Gizlilik politikasi
│   └── kullanim-kosullari/ — Kullanim kosullari
├── components/
│   ├── admin/              — Admin panel bilesenleri
│   ├── auth/               — Giris/kayit formlar, kurtarma kodlari
│   ├── layout/             — Header, DemographicBanner, PageHero
│   ├── map/                — TurkeyMap, DistrictMap, CityTooltip, MapToolbar
│   ├── results/            — PartyBars, TransparencyReport, DemographicComparison
│   ├── ui/                 — Confetti, Counter, ProgressBar, SearchableSelect
│   └── vote/               — VoteModal, PartyGrid, DemographicForm
├── hooks/                  — useFingerprint
├── lib/
│   ├── auth/               — JWT, middleware, admin auth, IP whitelist
│   ├── firebase/           — Client SDK config, Admin SDK
│   ├── db/                 — Drizzle schema, migrations
│   ├── fraud/              — Fraud scorer, VPN detection, disposable emails
│   ├── geo/                — Bolge, il, ilce verileri
│   ├── weighting/          — 8+ agirliklandirma motoru
│   ├── crypto/             — Oy sifreleme, kurtarma kodlari
│   └── admin/              — Audit log, sifrelenmis ayarlar
├── types/                  — TypeScript tip tanimlari
scripts/                    — Seed ve migration scriptleri
drizzle/                    — Veritabani migration dosyalari
public/geo/                 — Turkiye il/ilce GeoJSON verileri
```

## Dokumantasyon

- **SPEC.md** — Detayli teknik spesifikasyon (veritabani semasi, API endpoint'leri, agirliklandirma formulleri)
- **CLAUDE.md** — Gelistirici rehberi

## Lisans

Bu proje [GNU Affero General Public License v3.0](LICENSE) ile lisanslidir.

Bu lisans kapsaminda:
- Kaynak kodunu goruntuleyebilir, calistirabilir ve degistirebilirsiniz
- Degistirdiginiz surumu dagitirken kaynak kodunu acik tutmalisiniz
- Bu yazilimi ag uzerinden bir hizmet olarak sunarsaniz, kaynak kodunu kullanicilara saglamalisiniz
