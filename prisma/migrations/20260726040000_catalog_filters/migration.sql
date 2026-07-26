CREATE TABLE "CatalogFilter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatalogFilter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogFilterOption" (
    "id" TEXT NOT NULL,
    "filterId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatalogFilterOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductFilterSelection" (
    "productId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductFilterSelection_pkey" PRIMARY KEY ("productId", "optionId")
);

CREATE UNIQUE INDEX "CatalogFilter_slug_key" ON "CatalogFilter"("slug");
CREATE INDEX "CatalogFilter_active_position_idx" ON "CatalogFilter"("active", "position");
CREATE UNIQUE INDEX "CatalogFilterOption_filterId_slug_key" ON "CatalogFilterOption"("filterId", "slug");
CREATE INDEX "CatalogFilterOption_filterId_active_position_idx" ON "CatalogFilterOption"("filterId", "active", "position");
CREATE INDEX "ProductFilterSelection_optionId_idx" ON "ProductFilterSelection"("optionId");

ALTER TABLE "CatalogFilterOption"
ADD CONSTRAINT "CatalogFilterOption_filterId_fkey"
FOREIGN KEY ("filterId") REFERENCES "CatalogFilter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductFilterSelection"
ADD CONSTRAINT "ProductFilterSelection_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductFilterSelection"
ADD CONSTRAINT "ProductFilterSelection_optionId_fkey"
FOREIGN KEY ("optionId") REFERENCES "CatalogFilterOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CatalogFilter" ("id", "name", "slug", "active", "position")
VALUES
  ('filter-brand', 'Marca', 'marca', true, 0),
  ('filter-product-type', 'Tipo de produto', 'tipo-de-produto', true, 1);

INSERT INTO "CatalogFilterOption" ("id", "filterId", "label", "slug", "active", "position")
SELECT
  'brand-' || md5("brand"),
  'filter-brand',
  "brand",
  lower(regexp_replace("brand", '[^a-zA-Z0-9]+', '-', 'g')),
  true,
  CAST(row_number() OVER (ORDER BY "brand") AS INTEGER) - 1
FROM (SELECT DISTINCT "brand" FROM "Product") AS brands;

INSERT INTO "CatalogFilterOption" ("id", "filterId", "label", "slug", "active", "position")
VALUES ('type-smartphones', 'filter-product-type', 'Smartphones', 'smartphones', true, 0);

INSERT INTO "ProductFilterSelection" ("productId", "optionId")
SELECT product."id", 'brand-' || md5(product."brand")
FROM "Product" AS product;

INSERT INTO "ProductFilterSelection" ("productId", "optionId")
SELECT "id", 'type-smartphones'
FROM "Product";
