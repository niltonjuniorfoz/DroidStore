CREATE TABLE "AdminMediaAsset" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminMediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminMediaAsset_createdAt_idx" ON "AdminMediaAsset"("createdAt");
