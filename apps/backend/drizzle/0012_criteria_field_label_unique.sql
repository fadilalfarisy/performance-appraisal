WITH ranked AS (
	SELECT id, label,
		row_number() OVER (
			PARTITION BY criteria_set_id, lower(btrim(label))
			ORDER BY created_at, id
		) AS rn
	FROM criteria_fields
	WHERE is_deleted = false
)
UPDATE criteria_fields AS f
SET label = left(f.label, 240) || ' (' || left(f.id::text, 8) || ')'
FROM ranked
WHERE f.id = ranked.id AND ranked.rn > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_criteria_field_label" ON "criteria_fields" USING btree ("criteria_set_id","label") WHERE is_deleted = false;
