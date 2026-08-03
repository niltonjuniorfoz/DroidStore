-- Idempotência dos e-mails de pedido criado e pedido enviado
ALTER TABLE "Order" ADD COLUMN "createdEmailSentAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "shippedEmailSentAt" TIMESTAMP(3);
