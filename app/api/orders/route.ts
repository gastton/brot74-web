import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppNotification, buildOrderMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, deliverySlotId, items, notes, sessionToken } = body;

    if (!customerName || !customerPhone || !deliverySlotId || !items?.length) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const slot = await prisma.deliverySlot.findUnique({ where: { id: deliverySlotId } });
    if (!slot || !slot.active) {
      return NextResponse.json({ error: "Fecha no disponible" }, { status: 400 });
    }

    // Validate cart reservation if sessionToken provided
    const now = new Date();
    let reservationValid = false;
    if (sessionToken) {
      const reservations = await prisma.cartReservation.findMany({
        where: { sessionToken, expiresAt: { gt: now } },
      });
      if (reservations.length > 0) {
        const resMap = new Map(reservations.map((r) => [r.productId, r.quantity]));
        reservationValid = (items as { productId: number; quantity: number }[]).every(
          (item) => (resMap.get(item.productId) ?? 0) >= item.quantity
        );
      }
    }

    if (sessionToken && !reservationValid) {
      return NextResponse.json({ error: "Tu reserva expiró. Volvé a intentar." }, { status: 409 });
    }

    // Verify stock and calculate total
    let total = 0;
    const enrichedItems: { productId: number; quantity: number; unitPrice: number; name: string }[] = [];

    for (const item of items as { productId: number; quantity: number }[]) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.active) {
        return NextResponse.json({ error: `Producto no disponible: ${item.productId}` }, { status: 400 });
      }

      const stock = await prisma.productStock.findUnique({
        where: { productId_deliverySlotId: { productId: item.productId, deliverySlotId } },
      });

      if (stock) {
        let available: number;
        if (reservationValid) {
          // The reservation already holds this stock — only count confirmed orders
          available = stock.totalStock - stock.reservedStock;
        } else {
          // No reservation: deduct active cart reservations too
          const agg = await prisma.cartReservation.aggregate({
            where: { productId: item.productId, deliverySlotId, expiresAt: { gt: now } },
            _sum: { quantity: true },
          });
          available = stock.totalStock - stock.reservedStock - (agg._sum.quantity ?? 0);
        }

        if (available < item.quantity) {
          return NextResponse.json({ error: `Stock insuficiente para ${product.name}` }, { status: 400 });
        }
      }

      total += product.price * item.quantity;
      enrichedItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.price, name: product.name });
    }

    // Create order, reserve stock, and release cart reservation — all in one transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerName,
          customerPhone,
          deliverySlotId,
          total,
          notes: notes ?? "",
          status: "pending",
          items: {
            create: enrichedItems.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          },
        },
      });

      for (const item of enrichedItems) {
        await tx.productStock.updateMany({
          where: { productId: item.productId, deliverySlotId },
          data: { reservedStock: { increment: item.quantity } },
        });
      }

      if (sessionToken) {
        await tx.cartReservation.deleteMany({ where: { sessionToken } });
      }

      return newOrder;
    });

    try {
      const msg = buildOrderMessage({
        id: order.id,
        customerName,
        customerPhone,
        total,
        slotLabel: slot.dayLabel,
        items: enrichedItems,
      });
      await sendWhatsAppNotification(msg);
    } catch (e) {
      console.error("WhatsApp notification failed:", e);
    }

    return NextResponse.json({ orderId: order.id, total });
  } catch (e) {
    console.error("Order creation error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
