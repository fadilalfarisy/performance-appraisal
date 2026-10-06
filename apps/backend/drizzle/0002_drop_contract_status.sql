-- Contract status (ACTIVE/INACTIVE) was removed; "active" is now derived from the
-- contract dates. Replace the status-scoped overlap rule with a date-based one:
-- one employee cannot have two contracts with overlapping dates.
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_no_overlapping_active";--> statement-breakpoint
DROP INDEX "idx_contracts_status";--> statement-breakpoint
ALTER TABLE "contracts" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."contract_status";--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_no_overlap" EXCLUDE USING gist (
	"employee_id" WITH =,
	daterange("start_date", COALESCE("end_date", 'infinity'::date), '[]') WITH &&
) WHERE ("deleted_at" IS NULL);
