-- BRT-266 · Fecha de entrega del pedido. Solo aditivo: los pedidos existentes
-- (incluidos los ya entregados) quedan con NULL.
ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMP(3);
