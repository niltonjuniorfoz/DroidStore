-- Conta pode ser desativada sem apagar histórico (ex-funcionário perde acesso)
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
