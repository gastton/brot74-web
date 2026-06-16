import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppNotification, buildOrderMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, customerAddress, deliverySlotId, items, notes, isDelivery } = body;

    if (!customerName || !customerPhone || !deliverySlotId || !items?.length) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const slot = await prisma.deliverySlot.findUnique({
      where: { id: deliverySlotId },
    });
    if (!slot || !slot.active) {
      return NextResponse.json({ error: "Fecha no disponible" }, { status: 400 });
    }

    // Validar que la elección del cliente sea válida según el modo del slot
    const wantsDelivery = isDelivery ?? (slot.deliveryMode === "delivery");
    if (wantsDelivery && slot.deliveryMode === "pickup") {
      return NextResponse.json({ error: "Este slot no tiene delivery disponible" }, { status: 400 });
    }
    if (!wantsDelivery && slot.deliveryMode === "delivery") {
      return NextResponse.json({ error: "Este slot es solo delivery" }, { status: 400 });
    }
    if (wantsDelivery && !customerAddress) {
      return NextResponse.json({ error: "Dirección requerida para delivery" }, { status: 400 });
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

      if (stock) {
        const available = stock.totalStock - stock.reservedStock;
        if (available < item.quantity) {
          return NextResponse.json(
            { error: `Stock insuficiente para ${product.name}` },
            { status: 400 }
          );
        }
      }

      total += product.price * item.quantity;
      enrichedItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.price, name: product.name });
    }

    // Create order and reserve stock in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerName,
          customerPhone,
          customerAddress: customerAddress ?? "",
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

      // Reserve stock
      for (const item of enrichedItems) {
        await tx.productStock.updateMany({
          where: { productId: item.productId, deliverySlotId },
          data: { reservedStock: { increment: item.quantity } },
        });
      }

      return newOrder;
    });

    // Send WhatsApp notification
    try {
      const msg = buildOrderMessage({
        id: order.id,
        customerName,
        customerPhone,
        customerAddress,
        total,
        isDelivery: wantsDelivery,
        slotLabel: slot.dayLabel,
        notes,
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
