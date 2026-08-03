-- Índice para varredura de reservas expiradas e filtros por status
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
