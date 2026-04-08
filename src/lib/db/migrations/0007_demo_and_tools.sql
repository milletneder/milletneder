-- 0007: Demo tokens, embed tokens, custom reports + subscriptions.party_id

-- Demo tokens (parti tanıtım linkleri)
CREATE TABLE IF NOT EXISTS demo_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  created_by INTEGER REFERENCES admins(id),
  party_id INTEGER REFERENCES parties(id),
  party_name VARCHAR(100),
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_accessed_at TIMESTAMP,
  access_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS demo_tokens_token_idx ON demo_tokens (token);
CREATE INDEX IF NOT EXISTS demo_tokens_is_active_idx ON demo_tokens (is_active);

-- Embed tokens (araştırmacı widget embed'leri)
CREATE TABLE IF NOT EXISTS embed_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token VARCHAR(64) NOT NULL UNIQUE,
  config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS embed_tokens_token_idx ON embed_tokens (token);
CREATE INDEX IF NOT EXISTS embed_tokens_user_id_idx ON embed_tokens (user_id);

-- Custom report requests (parti özel rapor talepleri)
CREATE TABLE IF NOT EXISTS custom_report_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  party_id INTEGER REFERENCES parties(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  completed_at TIMESTAMP,
  report_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS custom_report_user_id_idx ON custom_report_requests (user_id);
CREATE INDEX IF NOT EXISTS custom_report_status_idx ON custom_report_requests (status);

-- Subscriptions tablosuna party_id kolonu ekle
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS party_id INTEGER REFERENCES parties(id);
