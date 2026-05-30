import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (type !== "payment" || !data?.id) {
      return NextResponse.json({ ok: true });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return NextResponse.json({ ok: true });
    }

    // Fetch payment details from MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) return NextResponse.json({ ok: true });

    const payment = await mpRes.json();
    const orderId = parseInt(payment.external_reference ?? "0");
    if (!orderId) return NextResponse.json({ ok: true });

    const newStatus =
      payment.status === "approved"
        ? "paid"
        : payment.status === "rejected"
        ? "cancelled"
        : "pending";

    await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus, mpPaymentId: String(data.id) },
    });

    // Release stock if cancelled
    if (newStatus === "cancelled") {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (order) {
        for (const item of order.items) {
          await prisma.productStock.updateMany({
            where: { productId: item.productId, deliverySlotId: order.deliverySlotId },
            data: { reservedStock: { decrement: item.quantity } },
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json({ ok: true });
  }
}
