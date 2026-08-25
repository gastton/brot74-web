import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppNotification, buildOrderMessage } from "@/lib/whatsapp";
import { normalizeCartItems } from "@/lib/cartItems";

class InsufficientStockError extends Error {
  constructor(public productId: number, public productName: string) {
    super(`Stock insuficiente para ${productName}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, deliverySlotId, items: rawItems, notes, sessionToken } = body;

    if (!customerName || !customerPhone || !deliverySlotId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const items = normalizeCartItems(rawItems);
    if (!items) {
      return NextResponse.json({ error: "Cantidades inválidas" }, { status: 400 });
    }

    const slot = await prisma.deliverySlot.findUnique({ where: { id: deliverySlotId } });
    if (!slot || !slot.active) {
      return NextResponse.json({ error: "Fecha no disponible" }, { status: 400 });
    }

    // Validate cart reservation if sessionToken provided
    const now = new Date();
    let reservationValid = false;
    if (sessionToken) {
      // BRT-110: filtrar también por deliverySlotId — si no, una reserva de
      // carrito activa para otra fecha de entrega se confunde con la de
      // este pedido (y más abajo se borraría por error).
      const reservations = await prisma.cartReservation.findMany({
        where: { sessionToken, deliverySlotId, expiresAt: { gt: now } },
      });
      if (reservations.length > 0) {
        const resMap = new Map(reservations.map((r) => [r.productId, r.quantity]));
        reservationValid = items.every(
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

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.active) {
        return NextResponse.json({ error: `Producto no disponible: ${item.productId}` }, { status: 400 });
      }

      const stock = await prisma.productStock.findUnique({
        where: { productId_deliverySlotId: { productId: item.productId, deliverySlotId } },
      });

      // BRT-113: sin fila de ProductStock para este producto+fecha se trata
      // como 0 disponible, no como "sin límite" — antes el pedido pasaba
      // sin ninguna validación de stock para ese ítem.
      if (!stock) {
        return NextResponse.json(
          { error: `Stock no disponible para ${product.name}` },
          { status: 400 }
        );
      }

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

      total += product.price * item.quantity;
      enrichedItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.price, name: product.name });
    }

    // Create order, reserve stock, and release cart reservation — all in one transaction
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
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

        // Orden consistente (por productId) al tomar los locks de fila de
        // ProductStock: si dos pedidos concurrentes comparten productos
        // pero los mandan en orden distinto, sin esto podrían deadlockear
        // entre sí en vez de simplemente competir por el stock.
        // Desde BRT-113, todo item en enrichedItems tiene garantizada su
        // fila de ProductStock (si no existía, ya se rechazó antes).
        const stockUpdates = [...enrichedItems].sort((a, b) => a.productId - b.productId);

        for (const item of stockUpdates) {
          // Update atómico: solo incrementa reservedStock si todavía hay
          // capacidad en ese momento exacto (BRT-109). Si dos requests
          // concurrentes compiten por el mismo stock, como mucho una de
          // las dos consigue afectar la fila.
          const affected = await tx.$executeRaw`
            UPDATE "ProductStock"
            SET "reservedStock" = "reservedStock" + ${item.quantity}
            WHERE "productId" = ${item.productId}
              AND "deliverySlotId" = ${deliverySlotId}
              AND "totalStock" - "reservedStock" >= ${item.quantity}
          `;

          if (affected === 0) {
            throw new InsufficientStockError(item.productId, item.name);
          }
        }

        if (sessionToken) {
          // BRT-110: solo la reserva de esta fecha, no todas las del
          // sessionToken — una reserva activa de otra fecha no se toca.
          await tx.cartReservation.deleteMany({ where: { sessionToken, deliverySlotId } });
        }

        return newOrder;
      });
    } catch (e) {
      if (e instanceof InsufficientStockError) {
        return NextResponse.json({ error: e.message }, { status: 409 });
      }
      throw e;
    }

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
