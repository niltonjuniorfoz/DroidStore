-- Taxas do gateway/maquininha configuráveis por loja (usadas no cálculo de margem)
ALTER TABLE "SiteContent" ADD COLUMN "pixFeePct" DECIMAL(6,3) NOT NULL DEFAULT 0.99;
ALTER TABLE "SiteContent" ADD COLUMN "cardFeePct" DECIMAL(6,3) NOT NULL DEFAULT 4.98;
ALTER TABLE "SiteContent" ADD COLUMN "cardInstallmentFeePct" DECIMAL(6,3) NOT NULL DEFAULT 2.08;
