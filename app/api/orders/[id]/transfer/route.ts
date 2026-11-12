import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { orderTokenMatches, readOrderIdAndToken } from "@/lib/orderToken";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/lib/rateLimit";

// Pasar un pedido de Mercado Pago a transferencia al alias.
//
// Desde "Todavía no pagaste" (por ejemplo, no le alcanzó el saldo en MP): el
// pedido deja de ser de MP y queda como uno por alias de siempre, sin
// vencimiento, así la limpieza de vencidos (BRT-256) no lo cancela mientras
// llega la transferencia. Se confirma a mano en el admin.
//
// Se conserva mpOrderId: si el cliente igual termina pagando con MP, el
// webhook lo confirma (la plata entró).
//
// Mismo token por pedido que el link de pago (BRT-251).
const TRANSFER_RATE_LIMIT = { max: 20, windowMs: 60 * 60 * 1000 };

const NOT_FOUND = { error: "Pedido no encontrado" };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { allowed, resetAt } = checkRateLimit(`order-transfer:${getClientIp(req)}`, TRANSFER_RATE_LIMIT);
  if (!allowed) {
    return tooManyRequestsResponse(resetAt, "Demasiados intentos desde tu conexión. Probá de nuevo en un rato.");
  }

  const request = await readOrderIdAndToken(req, params);
  if (!request) return NextResponse.json(NOT_FOUND, { status: 404 });

  const order = await prisma.order.findUnique({ where: { id: request.orderId } });
  if (!order || !orderTokenMatches(order.publicToken, request.token)) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  // Condicionado a que siga pendiente: si justo se confirmó el pago de MP o
  // venció y se canceló, no se toca.
  const { count } = await prisma.order.updateMany({
    where: { id: order.id, status: "pending" },
    data: { paymentMethod: "alias", paymentExpiresAt: null },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Este pedido ya no está pendiente de pago" }, { status: 409 });
  }

  return NextResponse.json({ status: "transfer", total: order.total });
}
