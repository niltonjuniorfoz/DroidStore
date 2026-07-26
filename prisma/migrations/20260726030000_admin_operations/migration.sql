ALTER TABLE "User"
ADD COLUMN "phone" TEXT,
ADD COLUMN "cpf" TEXT,
ADD COLUMN "birthDate" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

ALTER TABLE "Variant"
ADD COLUMN "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "SiteContent"
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "whatsapp" TEXT,
ADD COLUMN "pixDiscount" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "maxInstallments" INTEGER NOT NULL DEFAULT 12;

ALTER TABLE "Order"
ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'PIX',
ADD COLUMN "trackingCode" TEXT,
ADD COLUMN "shippingZipCode" TEXT,
ADD COLUMN "shippingStreet" TEXT,
ADD COLUMN "shippingNumber" TEXT,
ADD COLUMN "shippingComplement" TEXT,
ADD COLUMN "shippingNeighborhood" TEXT,
ADD COLUMN "shippingCity" TEXT,
ADD COLUMN "shippingState" TEXT,
ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3);

ALTER TABLE "OrderItem"
ADD COLUMN "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TYPE "StockMovementType" AS ENUM ('ENTRY', 'ADJUSTMENT', 'SALE', 'RETURN');

CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");
CREATE INDEX "StockMovement_variantId_createdAt_idx" ON "StockMovement"("variantId", "createdAt");
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");
CREATE UNIQUE INDEX "Favorite_userId_productId_key" ON "Favorite"("userId", "productId");

ALTER TABLE "OrderStatusHistory"
ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Favorite"
ADD CONSTRAINT "Favorite_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Favorite"
ADD CONSTRAINT "Favorite_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "OrderStatusHistory" ("id", "orderId", "fromStatus", "toStatus", "note", "createdAt")
SELECT 'initial-' || "id", "id", NULL, "status", 'Histórico inicial', "createdAt"
FROM "Order";
