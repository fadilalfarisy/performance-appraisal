ALTER TABLE "parent_criteria" ADD COLUMN "major" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "parent_criteria" ADD COLUMN "minor" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "parent_criteria" ADD COLUMN "patch" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "parent_criteria" DROP COLUMN "version";