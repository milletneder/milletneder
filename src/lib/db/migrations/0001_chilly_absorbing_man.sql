CREATE TABLE "admin_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_id" integer,
	"details" text,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"encrypted_value" text NOT NULL,
	"iv" varchar(32) NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "city_election_results_2023" (
	"id" serial PRIMARY KEY NOT NULL,
	"city" varchar(100) NOT NULL,
	"party_slug" varchar(100) NOT NULL,
	"vote_count" integer NOT NULL,
	"vote_share" numeric(8, 6) NOT NULL,
	"source" varchar(255) DEFAULT 'YSK 2023',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "city_election_2023_city_party_idx" UNIQUE("city","party_slug")
);
--> statement-breakpoint
CREATE TABLE "city_voter_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"city" varchar(100) NOT NULL,
	"voter_count" integer NOT NULL,
	"source" varchar(255) DEFAULT 'YSK 2023',
	"year" integer DEFAULT 2023,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "city_voter_counts_city_unique" UNIQUE("city")
);
--> statement-breakpoint
CREATE TABLE "election_results_2023" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_slug" varchar(100) NOT NULL,
	"vote_share" numeric(8, 6) NOT NULL,
	"vote_count" integer,
	"source" varchar(255) DEFAULT 'YSK',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fraud_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"factors" jsonb,
	"is_vpn" boolean DEFAULT false NOT NULL,
	"subnet_group" varchar(20),
	"last_calculated" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fraud_scores_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_name" varchar(20) NOT NULL,
	"color" varchar(7) DEFAULT '#555555' NOT NULL,
	"text_color" varchar(7) DEFAULT '#ffffff' NOT NULL,
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "phone_otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_hash" varchar(64) NOT NULL,
	"otp_code" varchar(6) NOT NULL,
	"channel" varchar(10) NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_sent_at" timestamp NOT NULL,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"encrypted_phone" text NOT NULL,
	"iv" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "published_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"round_id" integer,
	"report_data" jsonb,
	"summary" text,
	"view_count" integer DEFAULT 0,
	"is_published" boolean DEFAULT false,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "published_reports_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reference_demographics" (
	"id" serial PRIMARY KEY NOT NULL,
	"dimension" varchar(50) NOT NULL,
	"category" varchar(100) NOT NULL,
	"population_share" numeric(8, 6) NOT NULL,
	"source" varchar(255),
	"year" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ref_demo_dimension_category_idx" UNIQUE("dimension","category")
);
--> statement-breakpoint
CREATE TABLE "weighted_results_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"cache_key" varchar(255) NOT NULL,
	"raw_results" jsonb,
	"weighted_results" jsonb,
	"confidence" jsonb,
	"methodology" jsonb,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "weighted_cache_round_key_idx" UNIQUE("round_id","cache_key")
);
--> statement-breakpoint
CREATE TABLE "weighting_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer,
	"config_key" varchar(100) NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"parameters" jsonb,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weighting_configs_round_key_idx" UNIQUE("round_id","config_key")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "age_bracket" varchar(5);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "income_bracket" varchar(5);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" varchar(2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "education" varchar(5);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "turnout_intention" varchar(5);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "previous_vote_2023" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "flag_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_dummy" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "district" varchar(100);--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "is_dummy" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "is_carried_over" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "carried_from_round" integer;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city_voter_counts" ADD CONSTRAINT "city_voter_counts_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_scores" ADD CONSTRAINT "fraud_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_reports" ADD CONSTRAINT "published_reports_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weighted_results_cache" ADD CONSTRAINT "weighted_results_cache_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weighting_configs" ADD CONSTRAINT "weighting_configs_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weighting_configs" ADD CONSTRAINT "weighting_configs_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_admin_idx" ON "admin_audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "phone_otps_hash_idx" ON "phone_otps" USING btree ("phone_hash");--> statement-breakpoint
CREATE INDEX "phone_otps_expires_idx" ON "phone_otps" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_hash_idx" ON "users" USING btree ("phone_hash");