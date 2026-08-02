UPDATE "Variant"
SET "color" = UPPER(TRIM("color"))
WHERE "color" IS NOT NULL
  AND "color" <> UPPER(TRIM("color"));

UPDATE "Variant"
SET "condition" = 'NOVO'::"Condition"
WHERE "condition" = 'NOVO_REEMBALADO'::"Condition";

ALTER TABLE "Variant" ALTER COLUMN "stock" SET DEFAULT 20;
