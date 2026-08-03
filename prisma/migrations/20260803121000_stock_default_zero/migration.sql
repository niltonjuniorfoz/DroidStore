-- Produto novo nasce sem estoque; estoque entra por movimentação consciente.
-- Antes o default era 20, o que colocava à venda unidades que não existem.
ALTER TABLE "Variant" ALTER COLUMN "stock" SET DEFAULT 0;
