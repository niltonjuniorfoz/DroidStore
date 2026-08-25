-- Índices da vitrine paginada.
-- São aditivos e não alteram produtos, preços, estoque ou categorias.

CREATE INDEX IF NOT EXISTS "Product_active_updatedAt_idx"
ON "Product" ("active", "updatedAt");

CREATE INDEX IF NOT EXISTS "Product_brand_active_idx"
ON "Product" ("brand", "active");

CREATE INDEX IF NOT EXISTS "Variant_productId_condition_price_idx"
ON "Variant" ("productId", "condition", "price");

CREATE INDEX IF NOT EXISTS "Variant_storage_idx"
ON "Variant" ("storage");
