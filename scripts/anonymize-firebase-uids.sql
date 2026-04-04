-- Mevcut kullanıcıların firebase_uid değerlerini anonimleştir.
-- Bu script tüm gerçek firebase UID'leri rastgele değerlerle değiştirir.
-- firebase_uid sütunu DB'de kalıyor (NOT NULL + UNIQUE constraint),
-- ama artık anlamlı bir veri içermiyor.
--
-- Çalıştırma: psql "$DATABASE_URL" -f scripts/anonymize-firebase-uids.sql

-- Sadece gerçek firebase UID'leri anonimleştir (zaten anon_ olanları atla)
UPDATE users
SET firebase_uid = 'anon_' || encode(gen_random_bytes(24), 'hex'),
    updated_at = NOW()
WHERE firebase_uid NOT LIKE 'anon_%';
