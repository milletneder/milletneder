-- Oy yönü: Evet (true) / Hayır (false)
ALTER TABLE feature_votes ADD COLUMN IF NOT EXISTS is_upvote BOOLEAN NOT NULL DEFAULT true;
