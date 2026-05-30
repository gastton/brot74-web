import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isMPConfigured, getMPClient } from "@/lib/mercadopago";
import { sendWhatsAppNotification, buildOrderMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, customerAddress, deliverySlotId, items, notes } = body;

    if (!customerName || !customerPhone || !deliverySlotId || !items?.length) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const slot = await prisma.deliverySlot.findUnique({
      where: { id: deliverySlotId },
    });
    if (!slot || !slot.active) {
      return NextResponse.json({ error: "Fecha no disponible" }, { status: 400 });
    }

    if (slot.isDelivery && !customerAddress) {
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

    // Create Mercado Pago preference if configured
    let mpData: { preferenceId?: string; initPoint?: string } = {};
    if (isMPConfigured()) {
      try {
        const { Preference } = await import("mercadopago");
        const client = getMPClient();
        const preference = new Preference(client);
        const mpItems = enrichedItems.map((i) => ({
          id: String(i.productId),
          title: i.name,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          currency_id: "ARS",
        }));

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
        const result = await preference.create({
          body: {
            items: mpItems,
            payer: { name: customerName, phone: { number: customerPhone } },
            back_urls: {
              success: `${baseUrl}/confirmacion?order=${order.id}&status=success`,
              failure: `${baseUrl}/confirmacion?order=${order.id}&status=failure`,
              pending: `${baseUrl}/confirmacion?order=${order.id}&status=pending`,
            },
            auto_return: "approved",
            notification_url: `${baseUrl}/api/webhook/mercadopago`,
            external_reference: String(order.id),
          },
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { mpPreferenceId: result.id ?? "" },
        });

        mpData = { preferenceId: result.id ?? undefined, initPoint: result.init_point ?? undefined };
      } catch (e) {
        console.error("MP preference creation failed:", e);
      }
    }

    // Send WhatsApp notification
    try {
      const msg = buildOrderMessage({
        id: order.id,
        customerName,
        customerPhone,
        customerAddress,
        total,
        isDelivery: slot.isDelivery,
        slotLabel: slot.dayLabel,
        notes,
        items: enrichedItems,
      });
      await sendWhatsAppNotification(msg);
    } catch (e) {
      console.error("WhatsApp notification failed:", e);
    }

    return NextResponse.json({
      orderId: order.id,
      total,
      mpConfigured: isMPConfigured(),
      ...mpData,
    });
  } catch (e) {
    console.error("Order creation error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
