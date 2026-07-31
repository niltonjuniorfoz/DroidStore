CREATE TYPE "ProductImportStatus" AS ENUM ('APPLIED', 'ROLLED_BACK');

CREATE TABLE "ProductImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ProductImportStatus" NOT NULL DEFAULT 'APPLIED',
    "totalRows" INTEGER NOT NULL,
    "changedRows" INTEGER NOT NULL,
    "unchangedRows" INTEGER NOT NULL,
    "priceChanges" INTEGER NOT NULL DEFAULT 0,
    "costChanges" INTEGER NOT NULL DEFAULT 0,
    "stockChanges" INTEGER NOT NULL DEFAULT 0,
    "statusChanges" INTEGER NOT NULL DEFAULT 0,
    "changes" JSONB NOT NULL,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rolledBackAt" TIMESTAMP(3),
    "rollbackById" TEXT,

    CONSTRAINT "ProductImport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductImport_createdAt_idx" ON "ProductImport"("createdAt");
CREATE INDEX "ProductImport_status_createdAt_idx" ON "ProductImport"("status", "createdAt");
