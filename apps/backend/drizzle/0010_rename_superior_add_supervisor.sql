ALTER TABLE "employees" ADD COLUMN "supervisor_id" uuid;--> statement-breakpoint
UPDATE "employees" SET "supervisor_id" = "superior_id";--> statement-breakpoint
CREATE INDEX "idx_employees_supervisor" ON "employees" USING btree ("supervisor_id");
