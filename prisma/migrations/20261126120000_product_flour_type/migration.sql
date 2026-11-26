-- v69 · Tipo de harina del producto, para la escala de las tarjetas de
-- /productos. Solo aditivo: los productos existentes quedan con '' (sin dato,
-- la escala no se muestra) hasta que se cargue desde el admin.
ALTER TABLE "Product" ADD COLUMN "flourType" TEXT NOT NULL DEFAULT '';
