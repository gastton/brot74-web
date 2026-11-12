import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sweepExpiredMpOrders } from "@/lib/expiredMpOrders";
import { MercadoPagoError } from "@/lib/mercadoPago";
import { confirmMpOrder } from "@/lib/mpPaymentConfirmation";
import { PAID_STATUSES } from "@/lib/orderStatus";
import { orderTokenMatches } from "@/lib/orderToken";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/lib/rateLimit";

// BRT-257: estado de pago de un pedido, para la pantalla de vuelta desde MP.
//
// - Mismo token por pedido que el link de pago (BRT-251), en el body: sin él
//   responde 404, igual que un pedido que no existe. Solo devuelve el estado,
//   ningún dato del pedido.
// - Si el pedido de MP sigue pendiente, se le pregunta a MP en el momento
//   (misma confirmación que el webhook): el cliente suele volver antes de que
//   llegue el aviso y así ve "aprobado" sin esperar.
// - No depende del toggle mpCheckout, como el webhook.
//
// La pantalla puede consultar varias veces seguidas mientras espera: el freno
// por IP es más alto que el de crear pedidos.
const PAYMENT_STATUS_RATE_LIMIT = { max: 120, windowMs: 60 * 60 * 1000 };

const NOT_FOUND = { error: "Pedido no encontrado" };

/** approved = pago confirmado; pending = todavía no; rejected = el pedido se canceló (venció o lo canceló el admin). */
type PaymentStatus = "approved" | "pending" | "rejected";

function paymentStatus(orderStatus: string): PaymentStatus {
  if (PAID_STATUSES.includes(orderStatus)) return "approved";
  if (orderStatus === "cancelled") return "rejected";
  return "pending";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { allowed, resetAt } = checkRateLimit(`payment-status:${getClientIp(req)}`, PAYMENT_STATUS_RATE_LIMIT);
  if (!allowed) {
    return tooManyRequestsResponse(resetAt, "Demasiadas consultas desde tu conexión. Probá de nuevo en un rato.");
  }

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const token = body && typeof body === "object" ? (body as { token?: unknown }).token : undefined;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !orderTokenMatches(order.publicToken, token)) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  if (order.status === "pending" && order.paymentMethod === "mp" && order.mpOrderId) {
    // Primero confirmar (un pago de último momento le gana a la cancelación por vencido)...
    try {
      await confirmMpOrder(order.mpOrderId);
    } catch (e) {
      // MP no respondió: se informa lo que hay en la base; el webhook confirma después.
      if (!(e instanceof MercadoPagoError)) throw e;
      console.warn("Mercado Pago: no se pudo consultar la orden desde la pantalla de vuelta", {
        orderId,
        status: e.status,
      });
    }
    // ...y después cancelar si venció sin pagarse (BRT-256).
    await sweepExpiredMpOrders();
  }

  const current = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
  return NextResponse.json({ status: paymentStatus(current.status) });
}
