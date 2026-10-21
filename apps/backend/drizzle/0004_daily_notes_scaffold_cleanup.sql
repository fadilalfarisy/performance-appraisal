ALTER TABLE "dynamic_inputs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "dynamic_inputs" CASCADE;--> statement-breakpoint
ALTER TABLE "daily_notes" DROP CONSTRAINT "daily_notes_supervisor_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_notes" DROP COLUMN "supervisor_id";--> statement-breakpoint
ALTER TABLE "daily_notes" DROP COLUMN "score";--> statement-breakpoint
ALTER TABLE "daily_notes" DROP COLUMN "note";--> statement-breakpoint
ALTER TABLE "daily_notes" DROP COLUMN "description";