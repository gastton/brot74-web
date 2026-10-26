-- "Pedidos hasta" cierra a las 13:00 de Argentina (16:00 UTC) del día elegido.
-- Hasta ahora se guardaba a las 00:00 UTC (alta) o 12:00 UTC (edición): el
-- admin mostraba ese día en UTC, que es el que se eligió, y se conserva.
UPDATE "DeliverySlot"
SET "orderCutoff" = date_trunc('day', "orderCutoff") + interval '16 hours'
WHERE "orderCutoff" IS NOT NULL;
