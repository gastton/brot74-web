-- v51 · Descuento de producto
ALTER TABLE "Product" ADD COLUMN "discountActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "discountPrice" INTEGER;
