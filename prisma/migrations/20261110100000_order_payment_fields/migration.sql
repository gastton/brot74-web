-- BRT-250 · Campos de pago del pedido (Mercado Pago). Solo aditivo: los
-- pedidos existentes quedan como "alias" y con los campos de MP en NULL.
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'alias';
ALTER TABLE "Order" ADD COLUMN "mpPreferenceId" TEXT;
ALTER TABLE "Order" ADD COLUMN "mpPaymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_mpPaymentId_key" ON "Order"("mpPaymentId");
