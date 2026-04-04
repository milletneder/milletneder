# milletneder.com — Gelistirici Rehberi

## Proje Ozeti

**milletneder.com** Turkiye'nin 81 ilini kapsayan, aylik turlarda calisan bir online secim anketi platformudur.

- **Stack:** Next.js 15.5, TypeScript, Drizzle ORM, PostgreSQL
- **Kimlik Dogrulama:** Firebase Authentication (email + SMS), sifir PII mimarisi
- **Detayli teknik dokuman:** SPEC.md

## Kurulum

```bash
cp .env.example .env.local   # Ortam degiskenlerini doldur
npm install
npm run dev
```

## Onemli Kurallar

- **Sifir PII:** Veritabaninda email, telefon, isim, sifre SAKLANMAZ — sadece `firebase_uid` ve `identity_hash`
- **identity_hash:** Email veya telefon numarasinin SHA256 hash'i
- **Auth akisi:** Firebase ID Token → sunucuda dogrulama → kendi JWT'mizi verme
- **Admin auth:** Ayri sistem, email/sifre ile `admins` tablosu uzerinden

## Ortam Degiskenleri

Gerekli degiskenler icin `.env.example` dosyasina bakin.
