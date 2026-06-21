import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const slotId = req.nextUrl.searchParams.get("slotId");

  if (slotId) {
    const slotIdInt = parseInt(slotId);
    const now = new Date();

    const [products, cartReservations] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: { stocks: { where: { deliverySlotId: slotIdInt } } },
      }),
      prisma.cartReservation.groupBy({
        by: ["productId"],
        where: { deliverySlotId: slotIdInt, expiresAt: { gt: now } },
        _sum: { quantity: true },
      }),
    ]);

    const cartHeldMap = new Map(cartReservations.map((r) => [r.productId, r._sum.quantity ?? 0]));

    return NextResponse.json(
      products.map((p) => {
        const s = p.stocks[0] ?? null;
        const cartHeld = cartHeldMap.get(p.id) ?? 0;
        const available = s ? s.totalStock - s.reservedStock - cartHeld : null;
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
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
