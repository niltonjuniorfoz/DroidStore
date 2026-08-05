-- Visualizações da página de produto (medição de procura)
CREATE TABLE "ProductView" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "visitorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductView_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductView" ADD CONSTRAINT "ProductView_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ProductView_productId_createdAt_idx" ON "ProductView"("productId", "createdAt");
CREATE INDEX "ProductView_createdAt_idx" ON "ProductView"("createdAt");
