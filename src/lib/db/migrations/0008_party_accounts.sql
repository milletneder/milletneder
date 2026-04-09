-- 0008: party_accounts + custom_report temizligi + subscriptions.party_id drop
-- Kurumsal parti hesap mimarisi: parti aboneligi artik users.subscription_tier degil,
-- ayri bir party_accounts tablosuna bagli.

-- 1) party_accounts tablosu
CREATE TABLE IF NOT EXISTS party_accounts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  party_id INTEGER NOT NULL REFERENCES parties(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS party_accounts_party_id_idx ON party_accounts (party_id);

-- 2) custom_report_requests: party_account_id FK ekle, user_id nullable yap
ALTER TABLE custom_report_requests
  ADD COLUMN IF NOT EXISTS party_account_id INTEGER REFERENCES party_accounts(id);

ALTER TABLE custom_report_requests
  ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS custom_report_party_account_id_idx
  ON custom_report_requests (party_account_id);

-- 3) subscription_tier = 'parti' kullanicilarini sifirla (artik olmamali)
UPDATE users SET subscription_tier = 'free' WHERE subscription_tier = 'parti';

-- 4) plan_tier = 'parti' olan abonelikleri iptal et
UPDATE subscriptions SET status = 'cancelled' WHERE plan_tier = 'parti';

-- 5) subscriptions.party_id kolonu drop (artik kullanici aboneligine bagli degil)
ALTER TABLE subscriptions DROP COLUMN IF EXISTS party_id;
