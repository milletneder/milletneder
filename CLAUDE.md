# milletneder.com — Gelistirici Rehberi

## Proje Ozeti

**milletneder.com** Turkiye'nin 81 ilini kapsayan, aylik turlarda calisan bir online secim anketi platformudur.

- **Stack:** Next.js 15.5, TypeScript, Drizzle ORM, PostgreSQL
- **Kimlik Dogrulama:** Twilio Verify (SMS OTP + E-posta OTP) + JWT, sifir PII mimarisi
- **Detayli teknik dokuman:** SPEC.md

## Kurulum

```bash
cp .env.example .env.local   # Ortam degiskenlerini doldur
npm install
npm run dev
```

## Onemli Kurallar

- **Sifir PII:** Veritabaninda email, telefon, isim SAKLANMAZ — sadece `identity_hash`
- **identity_hash:** Email veya telefon numarasinin SHA256 hash'i
- **Auth akisi:** Twilio Verify OTP → sunucuda dogrulama → kendi JWT'mizi verme
- **Admin auth:** Ayri sistem, email/sifre ile `admins` tablosu uzerinden

## Gelistirme Akisi

- **Repo acik kaynaktir (public).** Hassas bilgi (sifre, IP, API key) ASLA commit edilmemeli.
- **Once staging, sonra production:** Tum gelistirmeler `staging` branch'inde yapilir, test edilir, kullanici onayi alinir, sonra `main`'e alinir.
- **Deploy otomatik:** GitHub Actions ile. Manuel SSH deploy yapilmaz.
- **Production'a onaysiz push yapilmaz** — canli site, gercek kullanici trafigi var.

## Tasarim Kurallari

- **Renk yasagi:** Parti renkleri haricinde hicbir renk kullanilmaz. Amber, kirmizi, yesil, mavi vs. YASAK. Sadece siyah, beyaz ve neutral gri tonlari (neutral-50 ~ neutral-900).
- **Sifir PII:** Kullanici verileri anonim tutulur.

## Veritabani Erisimleri

- **Production verisi VPS uzerindeki yerel PostgreSQL'dedir.** Lokal `.env.local` icerisindeki Neon DB sadece gelistirme/test icindir ve gercek veri ICERMEZ.
- **Rapor, istatistik veya kullanici verisi cekerken HER ZAMAN production DB kullanilmalidir.**

## Ortam Degiskenleri

Gerekli degiskenler icin `.env.example` dosyasina bakin.
