-- Backfill the contract window for appraisals created before contract_start_date
-- existed. New appraisals write both boundaries when the employee snapshot is
-- created.
UPDATE "appraisal_employees" ae
SET "contract_start_date" = c."start_date"
FROM "contracts" c
WHERE ae."contract_id" = c."id"
  AND ae."contract_start_date" IS NULL;
