CREATE TYPE "public"."field_input_type" AS ENUM('TEXT', 'NUMBER', 'OPTION', 'MULTI_OPTION', 'BOOLEAN', 'DATE');--> statement-breakpoint
CREATE TABLE "criteria_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"criteria_set_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"field_key" varchar(100) NOT NULL,
	"label" varchar(255) NOT NULL,
	"input_type" "field_input_type" NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"default_value" jsonb,
	"rules" jsonb,
	"options" jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "daily_note_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"value" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "daily_notes" ADD COLUMN "department_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD COLUMN "criteria_set_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD COLUMN "period" date NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "criteria_fields" ADD CONSTRAINT "criteria_fields_criteria_set_id_criteria_sets_id_fk" FOREIGN KEY ("criteria_set_id") REFERENCES "public"."criteria_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criteria_fields" ADD CONSTRAINT "criteria_fields_criterion_id_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_note_values" ADD CONSTRAINT "daily_note_values_note_id_daily_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."daily_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_note_values" ADD CONSTRAINT "daily_note_values_field_id_criteria_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."criteria_fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_criteria_field_key" ON "criteria_fields" USING btree ("criteria_set_id","criterion_id","field_key");--> statement-breakpoint
CREATE INDEX "idx_criteria_fields_set" ON "criteria_fields" USING btree ("criteria_set_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_daily_note_value_field" ON "daily_note_values" USING btree ("note_id","field_id");--> statement-breakpoint
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_criteria_set_id_criteria_sets_id_fk" FOREIGN KEY ("criteria_set_id") REFERENCES "public"."criteria_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_daily_note_employee_date" ON "daily_notes" USING btree ("employee_id","record_date") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "idx_daily_notes_department_period" ON "daily_notes" USING btree ("department_id","period");--> statement-breakpoint
CREATE INDEX "idx_daily_notes_employee" ON "daily_notes" USING btree ("employee_id");