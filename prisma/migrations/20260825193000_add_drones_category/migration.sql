-- Categoria Drones: cria/reativa a opção dentro do filtro Categoria.
WITH category_filter AS (
  SELECT "id"
  FROM "CatalogFilter"
  WHERE "active" = true
    AND (lower("slug") IN ('categoria', 'tipo-de-produto') OR lower("name") = 'categoria')
  ORDER BY CASE WHEN lower("slug") = 'categoria' THEN 0 ELSE 1 END, "position"
  LIMIT 1
),
next_position AS (
  SELECT COALESCE(MAX(o."position"), -1) + 1 AS pos
  FROM "CatalogFilterOption" o
  JOIN category_filter f ON f."id" = o."filterId"
)
INSERT INTO "CatalogFilterOption" ("id","filterId","label","slug","active","position","createdAt","updatedAt")
SELECT gen_random_uuid()::text, f."id", 'Drones', 'drones', true, p.pos, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM category_filter f CROSS JOIN next_position p
ON CONFLICT ("filterId","slug")
DO UPDATE SET "label"='Drones',"active"=true,"updatedAt"=CURRENT_TIMESTAMP;
