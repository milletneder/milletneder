# milletneder

Turkiye'nin 81 ilini kapsayan, aylik turlarda calisan acik kaynakli online secim anketi platformu.

## Ozellikler

- Turkiye genelinde il ve ilce bazinda anket sonuclari
- Demografik agirlıklandirma motoru (yas, cinsiyet, egitim, katilim)
- Sahtecılik tespiti (fingerprint, IP, cihaz analizi)
- Seffaflik raporu (metodoloji, guven araliklari, veri kalitesi)
- Interaktif Turkiye haritasi (il/ilce/bolge gorunum)
- Sifir PII mimarisi — veritabaninda kisisel bilgi saklanmaz

## Teknoloji Yigini

- **Framework:** Next.js 15.5 (App Router, TypeScript)
- **UI:** Tailwind CSS 4, Framer Motion
- **ORM:** Drizzle ORM
- **Veritabani:** PostgreSQL
- **Harita:** react-simple-maps + d3-geo
- **Kimlik Dogrulama:** Firebase Authentication (email/sifre + telefon/SMS) + JWT

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

# Bagimlilaklari yukle
npm install

# Ortam degiskenlerini ayarla
cp .env.example .env.local
# .env.local dosyasini kendi degerlerinle doldur

# Veritabani migration
npx drizzle-kit push

# Gelistirme sunucusunu baslat
npm run dev
```

Tarayicida [http://localhost:3000](http://localhost:3000) adresini ac.

### Ortam Degiskenleri

| Degisken | Aciklama |
|----------|----------|
| `DATABASE_URL` | PostgreSQL baglanti URL'si |
| `JWT_SECRET` | Kullanici JWT imzalama anahtari |
| `SETTINGS_ENCRYPTION_KEY` | Admin ayarlari sifrelemesi (AES-256-GCM) |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK service account JSON |
| `NEXT_PUBLIC_APP_URL` | Site URL'si |

Detayli bilgi icin `.env.example` dosyasina bakin.

## Proje Yapisi

```
src/
├── app/           — Next.js App Router sayfalari ve API route'lari
├── components/    — React bileşenleri (auth, harita, sonuclar, oy)
├── hooks/         — Custom React hook'lari
├── lib/           — Temel kutuphane (auth, DB, fraud, weighting)
└── types/         — TypeScript tip tanimlari
scripts/           — Seed ve migration scriptleri
drizzle/           — Veritabani migration dosyalari
public/            — Statik dosyalar ve GeoJSON verileri
```

## Dokumantasyon

- **SPEC.md** — Detayli teknik spesifikasyon
- **CLAUDE.md** — Gelistirici rehberi

## Lisans

Bu proje [GNU Affero General Public License v3.0](LICENSE) ile lisanslidir.

Bu lisans kapsaminda:
- Kaynak kodu goruntuleyebilir, calistiabilir ve degistirebilirsiniz
- Degistirdiginiz surumu dagitirken kaynak kodunu acik tutmalisiniz
- Bu yazilimi ag uzerinden bir hizmet olarak sunarsaniz, kaynak kodunu kullanicilara saglamalisiniz
