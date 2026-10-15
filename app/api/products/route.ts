import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasDiscount } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  const slotId = req.nextUrl.searchParams.get("slotId");

  if (slotId) {
    const slotIdInt = parseInt(slotId);

    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { stocks: { where: { deliverySlotId: slotIdInt } } },
    });

    // Sin reservas de carrito por tiempo: lo disponible es el stock de la
    // tanda menos lo ya pedido (pedidos creados al tocar "Pagar").
    return NextResponse.json(
      products.map((p) => {
        const s = p.stocks[0] ?? null;
        const available = s ? s.totalStock - s.reservedStock : null;
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          discountPrice: hasDiscount(p) ? p.discountPrice : null,
          weight: p.weight,
          ingredients: p.ingredients,
          imageUrl: p.imageUrl,
          focalX: p.focalX,
          focalY: p.focalY,
          imageScale: p.imageScale,
          stock: available,
          hasStock: available === null ? true : available > 0,
        };
      })
    );
  }

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      discountPrice: hasDiscount(p) ? p.discountPrice : null,
      weight: p.weight,
      ingredients: p.ingredients,
      imageUrl: p.imageUrl,
      focalX: p.focalX,
      focalY: p.focalY,
      imageScale: p.imageScale,
      stock: null,
      hasStock: true,
    }))
  );
}
