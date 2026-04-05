import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  numeric,
  uniqueIndex,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    anon_uid: varchar("anon_uid", { length: 128 }).notNull().unique(),
    identity_hash: varchar("identity_hash", { length: 64 }),
    city: varchar("city", { length: 100 }).notNull(),
    district: varchar("district", { length: 100 }),
    age_bracket: varchar("age_bracket", { length: 5 }),
    income_bracket: varchar("income_bracket", { length: 5 }),
    gender: varchar("gender", { length: 2 }),
    education: varchar("education", { length: 5 }),
    turnout_intention: varchar("turnout_intention", { length: 5 }),
    previous_vote_2023: varchar("previous_vote_2023", { length: 100 }),
    referral_code: varchar("referral_code", { length: 20 }).notNull().unique(),
    referred_by: integer("referred_by"),
    auth_provider: varchar("auth_provider", { length: 10 }).default("email").notNull(),
    is_flagged: boolean("is_flagged").default(false).notNull(),
    flag_reason: text("flag_reason"),
    is_active: boolean("is_active").default(true).notNull(),
    is_dummy: boolean("is_dummy").default(false).notNull(),
    password_hash: varchar("password_hash", { length: 255 }),
    recovery_email_hash: varchar("recovery_email_hash", { length: 64 }),
    encrypted_vek: text("encrypted_vek"),
    recovery_codes: jsonb("recovery_codes"),
    vote_encryption_version: integer("vote_encryption_version").default(0).notNull(),
    recovery_codes_confirmed: boolean("recovery_codes_confirmed").default(false).notNull(),
    recovery_codes_generated_at: timestamp("recovery_codes_generated_at"),
    badges: text("badges").default("[]").notNull(),
    last_login_at: timestamp("last_login_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_anon_uid_idx").on(table.anon_uid),
    uniqueIndex("users_referral_code_idx").on(table.referral_code),
    index("users_identity_hash_idx").on(table.identity_hash),
  ]
);

export const rounds = pgTable("rounds", {
  id: serial("id").primaryKey(),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  is_active: boolean("is_active").default(false).notNull(),
  is_published: boolean("is_published").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    round_id: integer("round_id")
      .notNull()
      .references(() => rounds.id),
    party: varchar("party", { length: 100 }),
    encrypted_party: text("encrypted_party"),
    city: varchar("city", { length: 100 }).notNull(),
    district: varchar("district", { length: 100 }),
    is_valid: boolean("is_valid").default(true).notNull(),
    is_dummy: boolean("is_dummy").default(false).notNull(),
    is_carried_over: boolean("is_carried_over").default(false).notNull(),
    carried_from_round: integer("carried_from_round"),
    change_count: integer("change_count").default(0).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("votes_user_round_idx").on(table.user_id, table.round_id),
    index("votes_round_party_idx").on(table.round_id, table.party),
    index("votes_round_city_idx").on(table.round_id, table.city),
  ]
);

export const voteChanges = pgTable("vote_changes", {
  id: serial("id").primaryKey(),
  vote_id: integer("vote_id")
    .notNull()
    .references(() => votes.id),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  round_id: integer("round_id")
    .notNull()
    .references(() => rounds.id),
  old_party: varchar("old_party", { length: 100 }),
  new_party: varchar("new_party", { length: 100 }),
  encrypted_old_party: text("encrypted_old_party"),
  encrypted_new_party: text("encrypted_new_party"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const deviceLogs = pgTable(
  "device_logs",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    fingerprint: text("fingerprint"),
    ip_address: varchar("ip_address", { length: 45 }),
    user_agent: text("user_agent"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("device_logs_fingerprint_idx").on(table.fingerprint)]
);

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  last_login_at: timestamp("last_login_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  admin_id: integer("admin_id").notNull().references(() => admins.id),
  action: varchar("action", { length: 100 }).notNull(),
  target_type: varchar("target_type", { length: 50 }).notNull(),
  target_id: integer("target_id"),
  details: text("details"),
  ip_address: varchar("ip_address", { length: 45 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audit_logs_admin_idx").on(table.admin_id),
  index("audit_logs_created_at_idx").on(table.created_at),
]);

export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  short_name: varchar("short_name", { length: 20 }).notNull(),
  color: varchar("color", { length: 7 }).notNull().default('#555555'),
  text_color: varchar("text_color", { length: 7 }).notNull().default('#ffffff'),
  logo_url: text("logo_url"),
  is_active: boolean("is_active").default(true).notNull(),
  sort_order: integer("sort_order").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const publishedReports = pgTable('published_reports', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  round_id: integer('round_id').references(() => rounds.id),
  report_data: jsonb('report_data'),
  summary: text('summary'),
  view_count: integer('view_count').default(0),
  is_published: boolean('is_published').default(false),
  published_at: timestamp('published_at'),
  created_at: timestamp('created_at').defaultNow(),
});

// --- Ağırlıklandırma & Doğrulama Tabloları ---

export const weightingConfigs = pgTable("weighting_configs", {
  id: serial("id").primaryKey(),
  round_id: integer("round_id").references(() => rounds.id),
  config_key: varchar("config_key", { length: 100 }).notNull(),
  is_enabled: boolean("is_enabled").default(false).notNull(),
  parameters: jsonb("parameters"),
  updated_by: integer("updated_by").references(() => admins.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("weighting_configs_round_key_idx").on(table.round_id, table.config_key),
]);

export const referenceDemographics = pgTable("reference_demographics", {
  id: serial("id").primaryKey(),
  dimension: varchar("dimension", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  population_share: numeric("population_share", { precision: 8, scale: 6 }).notNull(),
  source: varchar("source", { length: 255 }),
  year: integer("year"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("ref_demo_dimension_category_idx").on(table.dimension, table.category),
]);

export const electionResults2023 = pgTable("election_results_2023", {
  id: serial("id").primaryKey(),
  party_slug: varchar("party_slug", { length: 100 }).notNull(),
  vote_share: numeric("vote_share", { precision: 8, scale: 6 }).notNull(),
  vote_count: integer("vote_count"),
  source: varchar("source", { length: 255 }).default("YSK"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const cityElectionResults2023 = pgTable("city_election_results_2023", {
  id: serial("id").primaryKey(),
  city: varchar("city", { length: 100 }).notNull(),
  party_slug: varchar("party_slug", { length: 100 }).notNull(),
  vote_count: integer("vote_count").notNull(),
  vote_share: numeric("vote_share", { precision: 8, scale: 6 }).notNull(),
  source: varchar("source", { length: 255 }).default("YSK 2023"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("city_election_2023_city_party_idx").on(table.city, table.party_slug),
]);

export const fraudScores = pgTable("fraud_scores", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id).unique(),
  score: numeric("score", { precision: 5, scale: 2 }).default("0").notNull(),
  factors: jsonb("factors"),
  is_vpn: boolean("is_vpn").default(false).notNull(),
  subnet_group: varchar("subnet_group", { length: 20 }),
  last_calculated: timestamp("last_calculated"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const weightedResultsCache = pgTable("weighted_results_cache", {
  id: serial("id").primaryKey(),
  round_id: integer("round_id").notNull().references(() => rounds.id),
  cache_key: varchar("cache_key", { length: 255 }).notNull(),
  raw_results: jsonb("raw_results"),
  weighted_results: jsonb("weighted_results"),
  confidence: jsonb("confidence"),
  methodology: jsonb("methodology"),
  calculated_at: timestamp("calculated_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at").notNull(),
}, (table) => [
  unique("weighted_cache_round_key_idx").on(table.round_id, table.cache_key),
]);

export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  setting_key: varchar("setting_key", { length: 100 }).notNull().unique(),
  encrypted_value: text("encrypted_value").notNull(),
  iv: varchar("iv", { length: 32 }).notNull(),
  updated_by: integer("updated_by").references(() => admins.id),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// --- Auth Logları ---
export const authLogs = pgTable("auth_logs", {
  id: serial("id").primaryKey(),
  event_type: varchar("event_type", { length: 50 }).notNull(), // login, login_fail, register, register_fail, register_incomplete
  auth_method: varchar("auth_method", { length: 20 }), // email, phone
  identity_hint: varchar("identity_hint", { length: 20 }), // maskelenmiş (son 4 hane veya ***@domain)
  user_id: integer("user_id"),
  ip_address: varchar("ip_address", { length: 45 }),
  user_agent: text("user_agent"),
  error_code: varchar("error_code", { length: 100 }),
  error_message: text("error_message"),
  details: jsonb("details"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("auth_logs_event_type_idx").on(table.event_type),
  index("auth_logs_created_at_idx").on(table.created_at),
]);

export type Party = typeof parties.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Round = typeof rounds.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type VoteChange = typeof voteChanges.$inferSelect;
export type DeviceLog = typeof deviceLogs.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type PublishedReport = typeof publishedReports.$inferSelect;
export type WeightingConfig = typeof weightingConfigs.$inferSelect;
export type ReferenceDemographic = typeof referenceDemographics.$inferSelect;
export type ElectionResult2023 = typeof electionResults2023.$inferSelect;
export type FraudScore = typeof fraudScores.$inferSelect;
export type WeightedResultsCache = typeof weightedResultsCache.$inferSelect;

// --- Seçmen Sayısı Tablosu ---

export const cityVoterCounts = pgTable("city_voter_counts", {
  id: serial("id").primaryKey(),
  city: varchar("city", { length: 100 }).notNull().unique(),
  voter_count: integer("voter_count").notNull(),
  source: varchar("source", { length: 255 }).default("YSK 2023"),
  year: integer("year").default(2023),
  updated_by: integer("updated_by").references(() => admins.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// --- İlçe Bazlı Referans Verileri ---

export const districtElectionResults2023 = pgTable("district_election_results_2023", {
  id: serial("id").primaryKey(),
  city: varchar("city", { length: 100 }).notNull(),
  district: varchar("district", { length: 100 }).notNull(),
  party_slug: varchar("party_slug", { length: 100 }).notNull(),
  vote_count: integer("vote_count").notNull(),
  vote_share: numeric("vote_share", { precision: 8, scale: 6 }).notNull(),
  source: varchar("source", { length: 255 }).default("YSK 2023"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("district_election_2023_city_district_party_idx").on(table.city, table.district, table.party_slug),
]);

export const districtVoterCounts = pgTable("district_voter_counts", {
  id: serial("id").primaryKey(),
  city: varchar("city", { length: 100 }).notNull(),
  district: varchar("district", { length: 100 }).notNull(),
  voter_count: integer("voter_count").notNull(),
  source: varchar("source", { length: 255 }).default("YSK 2023"),
  year: integer("year").default(2023),
  updated_by: integer("updated_by").references(() => admins.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("district_voter_counts_city_district_idx").on(table.city, table.district),
]);

// --- Anonim Oy Sayaçları (E2E Vote Privacy) ---

export const anonymousVoteCounts = pgTable("anonymous_vote_counts", {
  id: serial("id").primaryKey(),
  round_id: integer("round_id").notNull().references(() => rounds.id),
  party: varchar("party", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  district: varchar("district", { length: 100 }),
  age_bracket: varchar("age_bracket", { length: 5 }),
  gender: varchar("gender", { length: 2 }),
  education: varchar("education", { length: 5 }),
  income_bracket: varchar("income_bracket", { length: 5 }),
  turnout_intention: varchar("turnout_intention", { length: 5 }),
  previous_vote_2023: varchar("previous_vote_2023", { length: 100 }),
  is_valid: boolean("is_valid").default(true).notNull(),
  is_dummy: boolean("is_dummy").default(false).notNull(),
  vote_count: integer("vote_count").default(0).notNull(),
}, (table) => [
  index("anon_votes_round_party_idx").on(table.round_id, table.party),
  index("anon_votes_round_city_idx").on(table.round_id, table.city),
  unique("anon_votes_dimension_idx").on(
    table.round_id, table.party, table.city, table.district,
    table.age_bracket, table.gender, table.education,
    table.income_bracket, table.turnout_intention, table.previous_vote_2023,
    table.is_valid, table.is_dummy,
  ),
]);

export const voteTransactionLog = pgTable("vote_transaction_log", {
  id: serial("id").primaryKey(),
  tx_type: varchar("tx_type", { length: 20 }).notNull(), // OY_KULLANIM, OY_DEGISIKLIK, OY_DEVIR, KAYIT
  round_id: integer("round_id").default(0).notNull(),
  city: varchar("city", { length: 100 }),
  district: varchar("district", { length: 100 }),
  party: varchar("party", { length: 100 }),
  old_party: varchar("old_party", { length: 100 }),
  new_party: varchar("new_party", { length: 100 }),
  is_valid: boolean("is_valid").default(true),
  is_dummy: boolean("is_dummy").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("vote_tx_log_round_idx").on(table.round_id),
  index("vote_tx_log_created_at_idx").on(table.created_at),
]);

export type VoteTransactionLog = typeof voteTransactionLog.$inferSelect;

export type AnonymousVoteCount = typeof anonymousVoteCounts.$inferSelect;

export type CityVoterCount = typeof cityVoterCounts.$inferSelect;
export type CityElectionResult2023 = typeof cityElectionResults2023.$inferSelect;
export type DistrictElectionResult2023 = typeof districtElectionResults2023.$inferSelect;
export type DistrictVoterCount = typeof districtVoterCounts.$inferSelect;
export type AdminSetting = typeof adminSettings.$inferSelect;

// --- Özellik Önerileri (User Voice) ---

export const featureRequests = pgTable("feature_requests", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  vote_count: integer("vote_count").default(0).notNull(),
  comment_count: integer("comment_count").default(0).notNull(),
  is_open: boolean("is_open").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("feature_requests_vote_count_idx").on(table.vote_count),
  index("feature_requests_created_at_idx").on(table.created_at),
]);

export const featureComments = pgTable("feature_comments", {
  id: serial("id").primaryKey(),
  request_id: integer("request_id").notNull().references(() => featureRequests.id, { onDelete: "cascade" }),
  user_id: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const featureVotes = pgTable("feature_votes", {
  id: serial("id").primaryKey(),
  request_id: integer("request_id").notNull().references(() => featureRequests.id, { onDelete: "cascade" }),
  user_id: integer("user_id").notNull().references(() => users.id),
  is_upvote: boolean("is_upvote").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("feature_votes_user_request_idx").on(table.user_id, table.request_id),
]);

export type FeatureRequest = typeof featureRequests.$inferSelect;
export type FeatureComment = typeof featureComments.$inferSelect;
export type FeatureVote = typeof featureVotes.$inferSelect;
