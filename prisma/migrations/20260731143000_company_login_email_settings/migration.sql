ALTER TABLE "SiteContent"
ADD COLUMN "companyLegalName" TEXT,
ADD COLUMN "companyTaxId" TEXT,
ADD COLUMN "companyPhone" TEXT,
ADD COLUMN "companyAddress" TEXT,
ADD COLUMN "companyCity" TEXT,
ADD COLUMN "companyState" TEXT,
ADD COLUMN "companyZipCode" TEXT,
ADD COLUMN "customerLoginEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "loginTitle" TEXT NOT NULL DEFAULT 'Acesse sua conta',
ADD COLUMN "loginSubtitle" TEXT NOT NULL DEFAULT 'Entre para acompanhar pedidos, favoritos e finalizar suas compras.',
ADD COLUMN "transactionalEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "transactionalFromName" TEXT,
ADD COLUMN "transactionalFromEmail" TEXT,
ADD COLUMN "transactionalReplyTo" TEXT;

ALTER TABLE "Order" ADD COLUMN "paidEmailSentAt" TIMESTAMP(3);
