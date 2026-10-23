ALTER TYPE "public"."criteria_set_status" RENAME VALUE 'SUPERSEDED' TO 'ARCHIVED';--> statement-breakpoint
DROP INDEX "uq_criteria_sets_version";--> statement-breakpoint
DROP INDEX "uq_criteria_sets_active";--> statement-breakpoint
DROP INDEX "uq_criteria_field_key";--> statement-breakpoint
ALTER TABLE "criteria_sets" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "criteria_sets" ADD CONSTRAINT "criteria_sets_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_criteria_sets_department_version" ON "criteria_sets" USING btree (coalesce("department_id", '00000000-0000-0000-0000-000000000000'::uuid),"version");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_criteria_sets_department_active" ON "criteria_sets" USING btree (coalesce("department_id", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "idx_criteria_sets_department" ON "criteria_sets" USING btree ("department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_criteria_field_key" ON "criteria_fields" USING btree ("criteria_set_id","criterion_id","field_key") WHERE is_deleted = false;