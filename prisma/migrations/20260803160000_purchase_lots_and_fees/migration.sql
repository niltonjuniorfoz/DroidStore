-- Lotes de compra multi-moeda e taxa real do gateway por pedido
CREATE TABLE "PurchaseLot" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "unitCostFx" DECIMAL(12,2) NOT NULL,
    "exchangeRate" DECIMAL(12,4) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "freightBrl" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitCostBrl" DECIMAL(12,2) NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseLot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PurchaseLot" ADD CONSTRAINT "PurchaseLot_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "PurchaseLot_variantId_purchasedAt_idx" ON "PurchaseLot"("variantId", "purchasedAt");
CREATE INDEX "PurchaseLot_purchasedAt_idx" ON "PurchaseLot"("purchasedAt");

ALTER TABLE "Order" ADD COLUMN "gatewayFeeBrl" DECIMAL(12,2);
