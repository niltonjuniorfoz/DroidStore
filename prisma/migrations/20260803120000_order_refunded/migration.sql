-- Novo status de pedido: pagamento devolvido ao cliente
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
