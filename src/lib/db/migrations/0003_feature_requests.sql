-- Özellik Önerileri (User Voice) tabloları
CREATE TABLE IF NOT EXISTS feature_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS feature_requests_vote_count_idx ON feature_requests(vote_count);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS feature_requests_created_at_idx ON feature_requests(created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS feature_comments (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS feature_votes (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT feature_votes_user_request_idx UNIQUE(user_id, request_id)
);
