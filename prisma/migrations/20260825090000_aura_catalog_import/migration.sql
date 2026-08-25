-- CreateEnum
CREATE TYPE "AuraImportKind" AS ENUM ('AURA_JSON', 'SUPPLIER_XLSX');

-- CreateEnum
CREATE TYPE "AuraImportStatus" AS ENUM ('UPLOADED', 'PREVIEW', 'READY', 'PROCESSING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'ROLLED_BACK', 'PARTIAL_ROLLBACK');

-- CreateEnum
CREATE TYPE "AuraImportAction" AS ENUM ('CREATE', 'UPDATE', 'UNCHANGED', 'REVIEW', 'ERROR');

-- CreateEnum
CREATE TYPE "AuraImportItemStatus" AS ENUM ('PENDING', 'CREATED', 'UPDATED', 'UNCHANGED', 'REVIEW', 'ERROR', 'IGNORED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "AuraRoundingRule" AS ENUM ('CEIL_10', 'NEAREST_10', 'CEIL_50', 'CEIL_100');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "allowedDomains" JSONB NOT NULL DEFAULT '[]',
    "xlsxColumnMapping" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCatalogItem" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceGroup" TEXT,
    "sourceSubgroup" TEXT,
    "categoryPath" JSONB NOT NULL DEFAULT '[]',
    "sourceName" TEXT,
    "sourceBrand" TEXT,
    "sourceModel" TEXT,
    "sourceColor" TEXT,
    "sourceStorage" TEXT,
    "sourceCondition" TEXT,
    "supplierPriceUsd" DECIMAL(12,2),
    "lastKnownPriceUsd" DECIMAL(12,2),
    "exchangeRate" DECIMAL(12,4),
    "markupPercent" DECIMAL(7,2),
    "salePriceBrl" DECIMAL(12,2),
    "available" BOOLEAN NOT NULL DEFAULT false,
    "sourceImages" JSONB NOT NULL DEFAULT '[]',
    "rawData" JSONB,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPricingRule" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "markupPercent" DECIMAL(7,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierPricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCategoryMapping" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sourceGroup" TEXT NOT NULL,
    "sourceSubgroup" TEXT NOT NULL DEFAULT '',
    "optionIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierCategoryMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierConditionMapping" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sourceCondition" TEXT NOT NULL,
    "condition" "Condition" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierConditionMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierImageAsset" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "permanentUrl" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuraImportJob" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "kind" "AuraImportKind" NOT NULL DEFAULT 'AURA_JSON',
    "status" "AuraImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "fileName" TEXT NOT NULL,
    "sourceFileUrl" TEXT,
    "generator" TEXT,
    "schemaVersion" INTEGER,
    "exchangeRate" DECIMAL(12,4),
    "roundingRule" "AuraRoundingRule" NOT NULL DEFAULT 'CEIL_10',
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "preparedItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "createdItems" INTEGER NOT NULL DEFAULT 0,
    "updatedItems" INTEGER NOT NULL DEFAULT 0,
    "unchangedItems" INTEGER NOT NULL DEFAULT 0,
    "reviewItems" INTEGER NOT NULL DEFAULT 0,
    "errorItems" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdByName" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "rollbackById" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuraImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuraImportItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "sourceGroup" TEXT,
    "sourceSubgroup" TEXT,
    "groupKey" TEXT,
    "action" "AuraImportAction" NOT NULL,
    "status" "AuraImportItemStatus" NOT NULL DEFAULT 'PENDING',
    "quality" TEXT NOT NULL DEFAULT 'ok',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "sourceData" JSONB NOT NULL,
    "computedData" JSONB NOT NULL DEFAULT '{}',
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "productId" TEXT,
    "variantId" TEXT,
    "reviewedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuraImportItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_slug_key" ON "Supplier"("slug");
CREATE UNIQUE INDEX "SupplierCatalogItem_supplierId_sku_key" ON "SupplierCatalogItem"("supplierId", "sku");
CREATE INDEX "SupplierCatalogItem_variantId_idx" ON "SupplierCatalogItem"("variantId");
CREATE INDEX "SupplierCatalogItem_available_idx" ON "SupplierCatalogItem"("available");
CREATE INDEX "SupplierCatalogItem_sourceGroup_sourceSubgroup_idx" ON "SupplierCatalogItem"("sourceGroup", "sourceSubgroup");
CREATE UNIQUE INDEX "SupplierPricingRule_supplierId_brand_key" ON "SupplierPricingRule"("supplierId", "brand");
CREATE INDEX "SupplierPricingRule_supplierId_active_idx" ON "SupplierPricingRule"("supplierId", "active");
CREATE UNIQUE INDEX "SupplierCategoryMapping_supplier_group_subgroup_key" ON "SupplierCategoryMapping"("supplierId", "sourceGroup", "sourceSubgroup");
CREATE INDEX "SupplierCategoryMapping_supplier_group_subgroup_idx" ON "SupplierCategoryMapping"("supplierId", "sourceGroup", "sourceSubgroup");
CREATE UNIQUE INDEX "SupplierConditionMapping_supplier_condition_key" ON "SupplierConditionMapping"("supplierId", "sourceCondition");
CREATE INDEX "SupplierConditionMapping_supplierId_idx" ON "SupplierConditionMapping"("supplierId");
CREATE UNIQUE INDEX "SupplierImageAsset_supplierId_sourceUrl_key" ON "SupplierImageAsset"("supplierId", "sourceUrl");
CREATE INDEX "SupplierImageAsset_supplierId_lastUsedAt_idx" ON "SupplierImageAsset"("supplierId", "lastUsedAt");
CREATE INDEX "AuraImportJob_supplierId_createdAt_idx" ON "AuraImportJob"("supplierId", "createdAt");
CREATE INDEX "AuraImportJob_status_updatedAt_idx" ON "AuraImportJob"("status", "updatedAt");
CREATE INDEX "AuraImportJob_kind_createdAt_idx" ON "AuraImportJob"("kind", "createdAt");
CREATE UNIQUE INDEX "AuraImportItem_jobId_rowNumber_key" ON "AuraImportItem"("jobId", "rowNumber");
CREATE INDEX "AuraImportItem_jobId_status_idx" ON "AuraImportItem"("jobId", "status");
CREATE INDEX "AuraImportItem_jobId_action_idx" ON "AuraImportItem"("jobId", "action");
CREATE INDEX "AuraImportItem_jobId_sku_idx" ON "AuraImportItem"("jobId", "sku");
CREATE INDEX "AuraImportItem_jobId_groupKey_idx" ON "AuraImportItem"("jobId", "groupKey");

-- AddForeignKey
ALTER TABLE "SupplierCatalogItem" ADD CONSTRAINT "SupplierCatalogItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierCatalogItem" ADD CONSTRAINT "SupplierCatalogItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierPricingRule" ADD CONSTRAINT "SupplierPricingRule_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierCategoryMapping" ADD CONSTRAINT "SupplierCategoryMapping_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierConditionMapping" ADD CONSTRAINT "SupplierConditionMapping_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierImageAsset" ADD CONSTRAINT "SupplierImageAsset_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuraImportJob" ADD CONSTRAINT "AuraImportJob_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuraImportItem" ADD CONSTRAINT "AuraImportItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AuraImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the first trusted supplier without affecting existing catalog data.
INSERT INTO "Supplier" ("id", "name", "slug", "currency", "active", "allowedDomains", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Atacado Connect', 'atacado-connect', 'USD', true, '["atacadoconnect.com", "cdn.atacadoconnect.com"]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
