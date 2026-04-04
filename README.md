# #MilletNeDer

Türkiye'nin 81 ilini kapsayan, aylık turlarda çalışan açık kaynaklı online seçim anketi platformu.

**Temel Prensip:** Şeffaflık. Tüm metodolojiler, parametreler ve hesaplama yöntemleri açık şekilde yayınlanır.

## Özellikler

### Oy Sistemi
- Aylık turlarla çalışan çok partili anket sistemi
- Oy değiştirme ve turlar arası oy taşıma
- Kararsız (kararsızım) seçeneği ve oransal dağıtım
- Oy şifreleme (AES-256, versiyon desteği)
- Kurtarma kodları ile hesap kurtarma (PBKDF2)

### Ağırlıklandırma Motoru
8+ yapılandırılabilir ağırlıklandırma yöntemi:
- **Post-stratifikasyon:** TÜİK nüfus verileriyle demografik düzeltme
- **Raking (IPF):** Çok boyutlu yinelemeli orantılı uydurma
- **Bölgesel kota:** 7 coğrafi bölge için YSK seçmen dağılımına göre dengeleme
- **Katılım niyeti:** Oy kullanma olasılığına göre ayarlama
- **Güncellik:** Yeni oyları önde tutan üstel azalma
- **Bayesian düzeltme:** Küçük örneklemleri ulusal ortalamaya çekme
- **Partizan sapma:** 2023 seçim sonuçlarıyla düzeltme
- **Sahteclik skoru:** Ağırlıklandırma faktörü olarak dahil etme

### Sahteclik Tespiti
- Çok faktörlü skor sistemi (0-100): IP kümeleme, VPN/datacenter tespiti, hesap yaşı, tek kullanımlık e-posta engelleme, boş profil tespiti, şüpheli tarayıcı analizi
- Cihaz parmak izi ile çoklu hesap tespiti
- Eşik değerine göre oy geçersiz kılma veya ağırlık düşürme

### Harita ve Görselleştirme
- İnteraktif Türkiye haritası (il / ilçe / bölge görünüm modları)
- İl detay modalı ile parti dağılımı
- İlçe bazında detaylandırma
- Ham ve ağırlıklı veri modları arası geçiş

### Sonuçlar ve Analitik
- Canlı oy sayımı
- Parti çubuk grafikleri (ham vs ağırlıklı)
- İl karşılaştırma tabloları
- Katılım sıralaması (illerin temsil oranı)
- Demografik kırılım grafikleri (yaş, cinsiyet, eğitim, katılım niyeti)
- Güven göstergesi (örneklem büyüklüğü, hata payı)
- Şeffaflık raporu (veri kalitesi metrikleri)

### Kimlik Doğrulama ve Gizlilik
- Firebase Authentication (e-posta/şifre + telefon/SMS)
- **Sıfır PII mimarisi** — veritabanında e-posta, telefon, isim, şifre saklanmaz
- Sadece `firebase_uid` ve `identity_hash` (SHA256) tutulur
- Referans sistemi ve rozet kademeleri

### Admin Paneli
- İstatistik dashboard (kullanıcı, oy, şüpheli hesap grafikleri)
- Kullanıcı yönetimi (listeleme, detay, flag/unflag, silme)
- Oy inceleme ve filtreleme
- Tur yönetimi (oluşturma, düzenleme, detay)
- Parti yönetimi (CRUD, logo, renk, sıralama)
- Ağırlıklandırma konfigürasyonu
- Referans veri düzenleme (TÜİK, YSK verileri)
- Seçmen sayıları yönetimi
- Auth logları ve denetim geçmişi
- Ayarlar (auth yöntemi, Firebase durumu)

### İşlem Geçmişi
- Tüm işlemlerin kriptografik hash ile kaydı
- Oy kullanma, oy değiştirme, kayıt, taşıma işlemleri
- Çoklu filtre ve sayfalama desteği

### Raporlar
- Aylık yayınlanan anket raporları
- Görüntüleme sayısı takibi

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 15.5 (App Router, TypeScript) |
| UI | Tailwind CSS 4, Framer Motion |
| ORM | Drizzle ORM 0.45 |
| Veritabanı | PostgreSQL |
| Harita | react-simple-maps, d3-geo |
| Auth | Firebase Authentication + JWT |
| Parmak İzi | @fingerprintjs/fingerprintjs |
| Doğrulama | Zod |
| E-posta | Nodemailer |

## Kurulum

### Gereksinimler

- Node.js 20+
- PostgreSQL 15+
- Firebase projesi (Authentication etkin)

### Adımlar

```bash
# Repoyu klonla
git clone https://github.com/milletneder/milletneder.git
cd milletneder

# Bağımlılıkları yükle
npm install

# Ortam değişkenlerini ayarla
cp .env.example .env.local
# .env.local dosyasını kendi değerlerinle doldur (aşağıdaki tabloya bak)

# Firebase client config'ini güncelle
# src/lib/firebase/config.ts dosyasında kendi Firebase projenizin değerlerini girin

# Veritabanı migration
npx drizzle-kit push

# Referans verileri yükle (ilk kurulumda)
npx tsx scripts/seed-reference-data.ts
npx tsx scripts/seed-district-data.ts

# Geliştirme sunucusunu başlat
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini aç.

### Ortam Değişkenleri

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `DATABASE_URL` | Evet | PostgreSQL bağlantı URL'si |
| `JWT_SECRET` | Evet | Kullanıcı JWT imzalama anahtarı |
| `SETTINGS_ENCRYPTION_KEY` | Evet | Admin ayarları şifrelemesi (AES-256-GCM, 64 hex karakter) |
| `FIREBASE_SERVICE_ACCOUNT` | Evet | Firebase Admin SDK service account JSON |
| `NEXT_PUBLIC_APP_URL` | Evet | Site URL'si (örnek: `https://yourdomain.com`) |

Örnek değerler için `.env.example` dosyasına bakın.

### Firebase Kurulumu

1. [Firebase Console](https://console.firebase.google.com)'da yeni proje oluşturun
2. Authentication > Sign-in method'dan Email/Password ve/veya Phone'u etkinleştirin
3. Project Settings > Service Accounts'tan yeni private key indirin
4. İndirilen JSON'u `FIREBASE_SERVICE_ACCOUNT` env değişkenine koyun
5. `src/lib/firebase/config.ts` dosyasındaki config değerlerini kendi projenizinkilerle değiştirin

## Proje Yapısı

```
src/
├── app/                    — Sayfalar ve API route'ları
│   ├── admin/              — Admin paneli sayfaları
│   ├── api/                — REST API endpoint'leri
│   ├── metodoloji/         — Metodoloji sayfası
│   ├── profil/             — Kullanıcı profili
│   ├── raporlar/           — Aylık raporlar
│   ├── islemler/           — İşlem geçmişi
│   ├── auth/               — Firebase e-posta doğrulama
│   ├── gizlilik/           — Gizlilik politikası
│   └── kullanim-kosullari/ — Kullanım koşulları
├── components/
│   ├── admin/              — Admin panel bileşenleri
│   ├── auth/               — Giriş/kayıt formları, kurtarma kodları
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
│   ├── geo/                — Bölge, il, ilçe verileri
│   ├── weighting/          — 8+ ağırlıklandırma motoru
│   ├── crypto/             — Oy şifreleme, kurtarma kodları
│   └── admin/              — Audit log, şifrelenmiş ayarlar
├── types/                  — TypeScript tip tanımları
scripts/                    — Seed ve migration scriptleri
drizzle/                    — Veritabanı migration dosyaları
public/geo/                 — Türkiye il/ilçe GeoJSON verileri
```

## Dokümantasyon

- **SPEC.md** — Detaylı teknik spesifikasyon (veritabanı şeması, API endpoint'leri, ağırlıklandırma formülleri)
- **CLAUDE.md** — Geliştirici rehberi

## Lisans

Bu proje [GNU Affero General Public License v3.0](LICENSE) ile lisanslıdır.

Bu lisans kapsamında:
- Kaynak kodunu görüntüleyebilir, çalıştırabilir ve değiştirebilirsiniz
- Değiştirdiğiniz sürümü dağıtırken kaynak kodunu açık tutmalısınız
- Bu yazılımı ağ üzerinden bir hizmet olarak sunarsanız, kaynak kodunu kullanıcılara sağlamalısınız
