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

## Ortam Degiskenleri

Gerekli degiskenler icin `.env.example` dosyasina bakin.
