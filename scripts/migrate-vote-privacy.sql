-- 1. Create vote_transaction_log table
CREATE TABLE IF NOT EXISTS vote_transaction_log (
  id SERIAL PRIMARY KEY,
  tx_type VARCHAR(20) NOT NULL,
  round_id INT DEFAULT 0,
  city VARCHAR(100),
  district VARCHAR(100),
  party VARCHAR(100),
  old_party VARCHAR(100),
  new_party VARCHAR(100),
  is_valid BOOLEAN DEFAULT true,
  is_dummy BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vote_tx_log_round_idx ON vote_transaction_log(round_id);
CREATE INDEX IF NOT EXISTS vote_tx_log_created_at_idx ON vote_transaction_log(created_at);

-- 2. Populate anonymous_vote_counts from existing votes (if not already done)
INSERT INTO anonymous_vote_counts (round_id, party, city, district, age_bracket, gender, education, income_bracket, turnout_intention, previous_vote_2023, is_valid, is_dummy, vote_count)
SELECT v.round_id, v.party, v.city, v.district, u.age_bracket, u.gender, u.education,
  u.income_bracket, u.turnout_intention, u.previous_vote_2023, v.is_valid, v.is_dummy, COUNT(*)::int
FROM votes v JOIN users u ON v.user_id = u.id
WHERE v.party IS NOT NULL
GROUP BY v.round_id, v.party, v.city, v.district, u.age_bracket, u.gender, u.education,
  u.income_bracket, u.turnout_intention, u.previous_vote_2023, v.is_valid, v.is_dummy
ON CONFLICT (round_id, party, city, COALESCE(district,''), COALESCE(age_bracket,''), COALESCE(gender,''), COALESCE(education,''), COALESCE(income_bracket,''), COALESCE(turnout_intention,''), COALESCE(previous_vote_2023,''), is_valid, is_dummy)
DO UPDATE SET vote_count = EXCLUDED.vote_count;

-- 3. Populate vote_transaction_log from existing votes
INSERT INTO vote_transaction_log (tx_type, round_id, city, district, party, is_valid, is_dummy, created_at)
SELECT
  CASE WHEN v.is_carried_over THEN 'OY_DEVIR' ELSE 'OY_KULLANIM' END,
  v.round_id, v.city, v.district, v.party, v.is_valid, v.is_dummy, v.created_at
FROM votes v
WHERE v.party IS NOT NULL;

-- 4. Populate vote_transaction_log from vote_changes
INSERT INTO vote_transaction_log (tx_type, round_id, city, district, old_party, new_party, is_valid, is_dummy, created_at)
SELECT 'OY_DEGISIKLIK', vc.round_id, v.city, v.district, vc.old_party, vc.new_party, v.is_valid, v.is_dummy, vc.created_at
FROM vote_changes vc
JOIN votes v ON v.id = vc.vote_id
WHERE vc.old_party IS NOT NULL AND vc.new_party IS NOT NULL;

-- 5. Populate vote_transaction_log from user registrations
INSERT INTO vote_transaction_log (tx_type, round_id, city, district, is_valid, is_dummy, created_at)
SELECT 'KAYIT', 0, u.city, u.district, NULL, u.is_dummy, u.created_at
FROM users u
WHERE u.is_active = true;
