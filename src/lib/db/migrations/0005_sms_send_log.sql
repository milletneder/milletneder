-- SMS gönderim logları (provider bazlı analitik)
CREATE TABLE IF NOT EXISTS sms_send_log (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  phone_hint VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sms_send_log_provider_idx ON sms_send_log(provider);
CREATE INDEX IF NOT EXISTS sms_send_log_created_at_idx ON sms_send_log(created_at);

-- Kirli register_incomplete loglarını temizle:
-- Aynı user_id ile register logu olan tamamlanmamış kayıtları sil
DELETE FROM auth_logs
WHERE event_type = 'register_incomplete'
  AND user_id IS NOT NULL
  AND user_id IN (
    SELECT DISTINCT user_id FROM auth_logs WHERE event_type = 'register' AND user_id IS NOT NULL
  );

-- user_id olmayan ama identity_hint'e göre eşleşen tamamlanmamış kayıtları da sil
DELETE FROM auth_logs
WHERE event_type = 'register_incomplete'
  AND user_id IS NULL
  AND identity_hint IS NOT NULL
  AND identity_hint IN (
    SELECT DISTINCT identity_hint FROM auth_logs WHERE event_type = 'register' AND identity_hint IS NOT NULL
  );
