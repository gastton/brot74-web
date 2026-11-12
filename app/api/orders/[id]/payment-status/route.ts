import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sweepExpiredMpOrders } from "@/lib/expiredMpOrders";
import { MercadoPagoError } from "@/lib/mercadoPago";
import { confirmMpOrder } from "@/lib/mpPaymentConfirmation";
import { PAID_STATUSES } from "@/lib/orderStatus";
import { orderTokenMatches, readOrderIdAndToken } from "@/lib/orderToken";
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

/**
 * approved = pago confirmado; pending = MP todavía lo está procesando;
 * unpaid = MP dice que no hubo pago (volvió sin pagar, o se lo rechazaron);
 * transfer = pendiente, se paga por transferencia al alias (se confirma a
 * mano); rejected = el pedido se canceló (venció o lo canceló el admin).
 */
type PaymentStatus = "approved" | "pending" | "unpaid" | "transfer" | "rejected";

/**
 * Estados de la orden de MP sin un pago en curso: creada sin intentos, pago
 * rechazado, o cancelada/vencida. "processing" y "action_required" siguen
 * como pending porque el pago puede acreditarse.
 */
const MP_UNPAID_STATUSES = new Set(["created", "failed", "canceled", "expired"]);

function paymentStatus(order: { status: string; paymentMethod: string }): PaymentStatus {
  if (PAID_STATUSES.includes(order.status)) return "approved";
  if (order.status === "cancelled") return "rejected";
  return order.paymentMethod === "alias" ? "transfer" : "pending";
}

/** El total va solo para "transfer": es lo que hay que transferir. */
function statusResponse(order: { status: string; paymentMethod: string; total: number }) {
  const status = paymentStatus(order);
  return NextResponse.json(status === "transfer" ? { status, total: order.total } : { status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { allowed, resetAt } = checkRateLimit(`payment-status:${getClientIp(req)}`, PAYMENT_STATUS_RATE_LIMIT);
  if (!allowed) {
    return tooManyRequestsResponse(resetAt, "Demasiadas consultas desde tu conexión. Probá de nuevo en un rato.");
  }

  const request = await readOrderIdAndToken(req, params);
  if (!request) return NextResponse.json(NOT_FOUND, { status: 404 });
  const { orderId, token } = request;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !orderTokenMatches(order.publicToken, token)) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  // También para un pedido que se pasó a transferencia: si igual se pagó por MP, se confirma acá.
  if (order.status === "pending" && order.mpOrderId) {
    // Primero confirmar (un pago de último momento le gana a la cancelación por vencido)...
    let mpUnpaid = false;
    try {
      const result = await confirmMpOrder(order.mpOrderId);
      mpUnpaid = result.outcome === "not_paid" && MP_UNPAID_STATUSES.has(result.status.split("/")[0]);
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

    const afterCheck = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (afterCheck.status === "pending" && afterCheck.paymentMethod === "mp" && mpUnpaid) {
      return NextResponse.json({ status: "unpaid" });
    }
    return statusResponse(afterCheck);
  }

  return statusResponse(order);
}
