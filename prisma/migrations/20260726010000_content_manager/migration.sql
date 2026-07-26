ALTER TABLE "Product"
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "imageUrl" TEXT;

CREATE TABLE "NavigationItem" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NavigationItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteContent" (
  "id" TEXT NOT NULL DEFAULT 'main',
  "storeName" TEXT NOT NULL DEFAULT 'DroidStore',
  "heroEyebrow" TEXT NOT NULL DEFAULT 'Tecnologia boa cabe no seu bolso',
  "heroTitle" TEXT NOT NULL DEFAULT 'Seu próximo Android, escolhido sem complicação.',
  "heroDescription" TEXT NOT NULL DEFAULT 'Novos e seminovos com procedência, revisão técnica e garantia.',
  "heroImageUrl" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NavigationItem_active_position_idx" ON "NavigationItem"("active", "position");
