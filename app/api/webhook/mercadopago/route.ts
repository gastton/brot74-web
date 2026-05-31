import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

function verifySignature(req: NextRequest, rawBody: string, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // si no hay secret configurado, no bloqueamos (MP no configurado)

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  // Formato: ts=<timestamp>,v1=<hash>
  const ts = xSignature.match(/ts=([^,]+)/)?.[1] ?? "";
  const v1 = xSignature.match(/v1=([^,]+)/)?.[1] ?? "";

  if (!ts || !v1) return false;

  // Manifest según documentación de MP
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const computed = createHmac("sha256", secret).update(manifest).digest("hex");

  return computed === v1;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: { type?: string; data?: { id?: string | number } };

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { type, data } = body;

    if (type !== "payment" || !data?.id) {
      return NextResponse.json({ ok: true });
    }

    // Validar firma de MP
    if (!verifySignature(req, rawBody, String(data.id))) {
      console.warn("Webhook MP: firma inválida");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return NextResponse.json({ ok: true });
    }

    // Fetch payment details from MP (fuente de verdad)
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

    // Liberar stock si se canceló
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
