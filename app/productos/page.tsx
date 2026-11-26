import type { Metadata } from "next";
import ProductosPage, { type ProductoEditorial } from "@/components/productos/ProductosPage";
import { prisma } from "@/lib/db";
import { getOpenSlots } from "@/lib/openSlots";

// Catálogo fijo de productos, siempre igual (el flujo de pedidos solo los muestra
// con una fecha abierta). Sin precios ni stock: cambian por tanda. Lo único que
// depende de la fecha abierta es el texto del botón de pedir (misma fuente que la landing).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Productos · BROT 74",
  description: "Los panes de BROT 74: masa madre, harinas, agua, sal y tiempo.",
};

export default async function Page() {
  const [products, openSlots] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getOpenSlots(new Date(), 1),
  ]);

  const items: ProductoEditorial[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    weight: p.weight,
    ingredients: p.ingredients,
    imageUrl: p.imageUrl,
    focalX: p.focalX,
    focalY: p.focalY,
    imageScale: p.imageScale,
    flourType: p.flourType,
  }));

  return <ProductosPage products={items} open={openSlots.length > 0} />;
}
