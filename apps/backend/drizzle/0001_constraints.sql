-- Extension required for the contracts exclusion constraint.
CREATE EXTENSION IF NOT EXISTS "btree_gist";--> statement-breakpoint
-- One employee cannot have two ACTIVE contracts with overlapping dates.
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_no_overlapping_active" EXCLUDE USING gist (
	"employee_id" WITH =,
	daterange("start_date", COALESCE("end_date", 'infinity'::date), '[]') WITH &&
) WHERE ("status" = 'ACTIVE' AND "deleted_at" IS NULL);--> statement-breakpoint
-- An appraisal period must be the first day of its month.
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_period_first_day" CHECK ("period" = date_trunc('month', "period")::date);--> statement-breakpoint
-- Append-only audit log, partitioned by month on occurred_at.
CREATE TABLE "audit_logs" (
	"id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
	"occurred_at" timestamptz DEFAULT now() NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"user_id" uuid,
	"username" varchar(255),
	"role" varchar(50),
	"employee_number" varchar(50),
	"action" varchar(100) NOT NULL,
	"entity" varchar(100),
	"entity_id" varchar(100),
	"before_data" jsonb,
	"after_data" jsonb,
	"metadata" jsonb,
	"ip_address" varchar(64),
	"request_id" varchar(100),
	CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id", "occurred_at")
) PARTITION BY RANGE ("occurred_at");--> statement-breakpoint
CREATE TABLE "audit_logs_default" PARTITION OF "audit_logs" DEFAULT;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_occurred_at" ON "audit_logs" ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" ("entity", "entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "audit_logs" ("user_id", "occurred_at");--> statement-breakpoint
-- The application role may only append and read audit rows. Guarded so the
-- migration still applies when the restricted role does not exist (local dev).
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
		REVOKE ALL ON "audit_logs" FROM app_user;
		GRANT SELECT, INSERT ON "audit_logs" TO app_user;
		GRANT USAGE ON SEQUENCE "audit_logs_id_seq" TO app_user;
	END IF;
END
$$;
