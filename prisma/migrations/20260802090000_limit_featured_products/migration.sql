WITH ranked_featured AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "updatedAt" DESC) AS position
  FROM "Product"
  WHERE "featured" = true
)
UPDATE "Product"
SET "featured" = false
WHERE "id" IN (
  SELECT "id"
  FROM ranked_featured
  WHERE position > 10
);
