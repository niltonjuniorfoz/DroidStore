-- Desconto PIX por produto e tabela de parcelamento própria
ALTER TABLE "Product" ADD COLUMN "pixDiscountPct" INTEGER;
ALTER TABLE "Product" ADD COLUMN "installmentPlan" JSONB;
