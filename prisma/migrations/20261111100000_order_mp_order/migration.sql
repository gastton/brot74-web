-- BRT-251 · Link de pago de Mercado Pago (Checkout Pro, API de Orders). Solo
-- aditivo: los pedidos existentes quedan con NULL (sin token no pueden pagar
-- con MP, siguen por transferencia).
ALTER TABLE "Order" ADD COLUMN "mpOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN "publicToken" TEXT;

CREATE UNIQUE INDEX "Order_mpOrderId_key" ON "Order"("mpOrderId");
CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");
