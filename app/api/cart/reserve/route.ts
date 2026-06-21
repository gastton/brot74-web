import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

const TTL_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { slotId, items } = await req.json();

    if (!slotId || !items?.length) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_MS);

    for (const item of items as { productId: number; quantity: number }[]) {
      const stock = await prisma.productStock.findUnique({
        where: { productId_deliverySlotId: { productId: item.productId, deliverySlotId: slotId } },
      });

      if (!stock) {
        return NextResponse.json({ error: "Stock no encontrado", productId: item.productId }, { status: 400 });
      }

      const agg = await prisma.cartReservation.aggregate({
        where: { productId: item.productId, deliverySlotId: slotId, expiresAt: { gt: now } },
        _sum: { quantity: true },
      });

      const cartHeld = agg._sum.quantity ?? 0;
      const available = stock.totalStock - stock.reservedStock - cartHeld;

      if (available < item.quantity) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        return NextResponse.json(
          { error: `Stock insuficiente para ${product?.name ?? "este producto"}`, productId: item.productId },
          { status: 409 }
        );
      }
    }

    const sessionToken = randomUUID();

    await prisma.cartReservation.createMany({
      data: (items as { productId: number; quantity: number }[]).map((item) => ({
        productId: item.productId,
        deliverySlotId: slotId,
        quantity: item.quantity,
        sessionToken,
        expiresAt,
      })),
    });

    return NextResponse.json({ sessionToken, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    console.error("Reserve error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
