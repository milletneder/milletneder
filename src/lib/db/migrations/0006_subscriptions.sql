-- 0006: Subscriptions (Lemon Squeezy abonelik sistemi)

-- Users tablosuna subscription_tier kolonu ekle
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free';
CREATE INDEX IF NOT EXISTS users_subscription_tier_idx ON users (subscription_tier);

-- Subscriptions tablosu
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  lemon_squeezy_subscription_id VARCHAR(50) NOT NULL UNIQUE,
  lemon_squeezy_customer_id VARCHAR(50),
  lemon_squeezy_order_id VARCHAR(50),
  variant_id VARCHAR(50),
  plan_tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  billing_interval VARCHAR(10),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  renews_at TIMESTAMP,
  ends_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  custom_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_plan_tier_idx ON subscriptions (plan_tier);

-- Subscription Events tablosu (webhook audit log)
CREATE TABLE IF NOT EXISTS subscription_events (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES subscriptions(id),
  user_id INTEGER REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sub_events_subscription_id_idx ON subscription_events (subscription_id);
CREATE INDEX IF NOT EXISTS sub_events_user_id_idx ON subscription_events (user_id);
CREATE INDEX IF NOT EXISTS sub_events_created_at_idx ON subscription_events (created_at);
