CREATE TYPE "public"."appraisal_source" AS ENUM('MANUAL', 'SCHEDULER');--> statement-breakpoint
CREATE TYPE "public"."appraisal_status" AS ENUM('DRAFT', 'PENDING', 'SUBMITTED', 'APPROVED', 'COMPLETE');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."criteria_set_status" AS ENUM('DRAFT', 'ACTIVE', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."employee_gender" AS ENUM('MALE', 'FEMALE');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'HR', 'HEAD_DEPARTMENT', 'SUPERVISOR', 'MANAGER', 'GENERAL_MANAGER');--> statement-breakpoint
CREATE TABLE "appraisal_employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appraisal_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employee_number" varchar(50) NOT NULL,
	"employee_name" varchar(255) NOT NULL,
	"department_id" uuid,
	"department_name" varchar(255),
	"position_id" uuid,
	"position_name" varchar(255),
	"contract_id" uuid,
	"contract_type" varchar(50),
	"contract_end_date" date,
	"comment" text,
	"total_score" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "appraisal_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appraisal_employee_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "appraisal_status_history" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "appraisal_status_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"appraisal_id" uuid NOT NULL,
	"from_status" "appraisal_status",
	"to_status" "appraisal_status" NOT NULL,
	"action" varchar(20) NOT NULL,
	"comment" text,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appraisals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"period" date NOT NULL,
	"criteria_set_id" uuid NOT NULL,
	"status" "appraisal_status" DEFAULT 'DRAFT' NOT NULL,
	"source" "appraisal_source" DEFAULT 'MANUAL' NOT NULL,
	"created_by" uuid,
	"deleted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"contract_type" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" "contract_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"criteria_set_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"scale_min" integer NOT NULL,
	"scale_max" integer NOT NULL,
	"weight" numeric(5, 2) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "criteria_scale_check" CHECK ("criteria"."scale_min" < "criteria"."scale_max"),
	CONSTRAINT "criteria_weight_check" CHECK ("criteria"."weight" > 0)
);
--> statement-breakpoint
CREATE TABLE "criteria_scale_descriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"criterion_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "criteria_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"status" "criteria_set_status" DEFAULT 'DRAFT' NOT NULL,
	"effective_date" date,
	"note" text,
	"created_by" uuid,
	"activated_by" uuid,
	"activated_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "daily_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"record_date" date NOT NULL,
	"score" jsonb,
	"note" text,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"head_employee_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "dynamic_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" varchar(255) NOT NULL,
	"field" varchar(255) NOT NULL,
	"label" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"default_value" jsonb,
	"rules" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_number" varchar(50) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"gender" "employee_gender" NOT NULL,
	"birth_date" date NOT NULL,
	"join_date" date NOT NULL,
	"address" text,
	"department_id" uuid,
	"position_id" uuid,
	"status" "employee_status" DEFAULT 'ACTIVE' NOT NULL,
	"superior_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "positions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ip" varchar(64),
	"user_agent" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "user_departments" (
	"user_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	CONSTRAINT "user_departments_user_id_department_id_pk" PRIMARY KEY("user_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"employee_id" uuid,
	"role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "appraisal_employees" ADD CONSTRAINT "appraisal_employees_appraisal_id_appraisals_id_fk" FOREIGN KEY ("appraisal_id") REFERENCES "public"."appraisals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_employees" ADD CONSTRAINT "appraisal_employees_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_ratings" ADD CONSTRAINT "appraisal_ratings_appraisal_employee_id_appraisal_employees_id_fk" FOREIGN KEY ("appraisal_employee_id") REFERENCES "public"."appraisal_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_ratings" ADD CONSTRAINT "appraisal_ratings_criterion_id_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."criteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_status_history" ADD CONSTRAINT "appraisal_status_history_appraisal_id_appraisals_id_fk" FOREIGN KEY ("appraisal_id") REFERENCES "public"."appraisals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_criteria_set_id_criteria_sets_id_fk" FOREIGN KEY ("criteria_set_id") REFERENCES "public"."criteria_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criteria" ADD CONSTRAINT "criteria_criteria_set_id_criteria_sets_id_fk" FOREIGN KEY ("criteria_set_id") REFERENCES "public"."criteria_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criteria_scale_descriptions" ADD CONSTRAINT "criteria_scale_descriptions_criterion_id_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criteria_sets" ADD CONSTRAINT "criteria_sets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criteria_sets" ADD CONSTRAINT "criteria_sets_activated_by_users_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_notes" ADD CONSTRAINT "daily_notes_supervisor_id_employees_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_employee_id_employees_id_fk" FOREIGN KEY ("head_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_appraisal_employee" ON "appraisal_employees" USING btree ("appraisal_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_appraisal_rating" ON "appraisal_ratings" USING btree ("appraisal_employee_id","criterion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_appraisals_department_period" ON "appraisals" USING btree ("department_id","period") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "idx_appraisals_status" ON "appraisals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_appraisals_department_status" ON "appraisals" USING btree ("department_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_contracts_employee_start" ON "contracts" USING btree ("employee_id","start_date") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "idx_contracts_employee" ON "contracts" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_start_date" ON "contracts" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "idx_contracts_end_date" ON "contracts" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "idx_contracts_status" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contracts_created_at_desc" ON "contracts" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_criteria_set_code" ON "criteria" USING btree ("criteria_set_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_criteria_scale" ON "criteria_scale_descriptions" USING btree ("criterion_id","score");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_criteria_sets_version" ON "criteria_sets" USING btree ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_criteria_sets_active" ON "criteria_sets" USING btree ("status") WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "idx_departments_name" ON "departments" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_departments_code" ON "departments" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_departments_created_at_desc" ON "departments" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_dynamic_inputs_form_id" ON "dynamic_inputs" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "idx_dynamic_inputs_created_at_desc" ON "dynamic_inputs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_employees_number_active" ON "employees" USING btree ("employee_number") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "idx_employees_number" ON "employees" USING btree ("employee_number");--> statement-breakpoint
CREATE INDEX "idx_employees_fullname" ON "employees" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_employees_status" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_employees_department" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_employees_position" ON "employees" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "idx_employees_superior" ON "employees" USING btree ("superior_id");--> statement-breakpoint
CREATE INDEX "idx_employees_created_at_desc" ON "employees" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_positions_name" ON "positions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_positions_code" ON "positions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_positions_created_at_desc" ON "positions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_departments_department" ON "user_departments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_users_employee" ON "users" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_created_at_desc" ON "users" USING btree ("created_at" DESC NULLS LAST);