ALTER TYPE "public"."report_status" ADD VALUE 'PENDING' BEFORE 'SUBMITTED';--> statement-breakpoint
ALTER TYPE "public"."report_status" ADD VALUE 'GM_REVIEW' BEFORE 'DONE';--> statement-breakpoint
ALTER TYPE "public"."report_status" ADD VALUE 'REJECTED';