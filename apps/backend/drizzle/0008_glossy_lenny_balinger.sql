ALTER TABLE "criteria_fields" DROP CONSTRAINT "criteria_fields_criterion_id_criteria_id_fk";
--> statement-breakpoint
DROP INDEX "uq_criteria_field_key";--> statement-breakpoint
WITH ranked AS (
	SELECT id, field_key,
		row_number() OVER (PARTITION BY criteria_set_id, field_key ORDER BY created_at, id) AS rn
	FROM criteria_fields
	WHERE is_deleted = false
)
UPDATE criteria_fields AS f
SET field_key = left(f.field_key, 80) || '_' || substr(f.id::text, 1, 8)
FROM ranked
WHERE f.id = ranked.id AND ranked.rn > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_criteria_field_key" ON "criteria_fields" USING btree ("criteria_set_id","field_key") WHERE is_deleted = false;--> statement-breakpoint
ALTER TABLE "criteria_fields" DROP COLUMN "criterion_id";