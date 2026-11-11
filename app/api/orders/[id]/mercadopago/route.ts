import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/featureFlags";
import { orderTokenMatches } from "@/lib/orderToken";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/lib/rateLimit";
import {
  MP_PAYMENT_TTL_MINUTES,
  MercadoPagoError,
  createCheckoutOrder,
  getCheckoutOrder,
} from "@/lib/mercadoPago";

// BRT-251: link de pago de Mercado Pago (Checkout Pro, solo dinero en cuenta)
// para un pedido ya creado. El cliente manda el token que recibió al crear el
// pedido: sin él, cualquiera podría pasar pedidos ajenos a MP y hacer que se
// cancelen al vencer el link.
//
// Cada llamada puede crear una orden en MP, así que lleva su propio freno por IP.
const MP_CHECKOUT_RATE_LIMIT = { max: 20, windowMs: 60 * 60 * 1000 };

const NOT_FOUND = { error: "Pedido no encontrado" };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isFeatureEnabled(FEATURE_FLAGS.mpCheckout))) {
    return NextResponse.json({ error: "El pago con Mercado Pago no está disponible" }, { status: 404 });
  }

  const { allowed, resetAt } = checkRateLimit(`mp-checkout:${getClientIp(req)}`, MP_CHECKOUT_RATE_LIMIT);
  if (!allowed) {
    return tooManyRequestsResponse(resetAt, "Demasiados intentos de pago desde tu conexión. Probá de nuevo en un rato.");
  }

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const token = body && typeof body === "object" ? (body as { token?: unknown }).token : undefined;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { name: true } } } } },
  });
  // Token incorrecto y pedido inexistente responden igual: no se revela qué IDs existen.
  if (!order || !orderTokenMatches(order.publicToken, token)) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  if (order.status !== "pending") {
    return NextResponse.json({ error: "Este pedido ya no está pendiente de pago" }, { status: 409 });
  }

  const now = new Date();

  try {
    // Ya tiene link: mientras no venza se devuelve el mismo (el cliente tocó
    // dos veces o volvió atrás). Vencido, el pedido se cancela (BRT-256).
    if (order.mpOrderId) {
      if (!order.paymentExpiresAt || order.paymentExpiresAt <= now) {
        return NextResponse.json({ error: "El link de pago venció. Hacé el pedido de nuevo." }, { status: 409 });
      }
      const existing = await getCheckoutOrder(order.mpOrderId);
      return NextResponse.json({ checkoutUrl: existing.checkoutUrl });
    }

    const mpOrder = await createCheckoutOrder({
      orderId: order.id,
      // Mismo pedido → misma clave: si dos llamadas compiten, MP devuelve la
      // misma orden. Lleva parte del token para no chocar con un pedido de
      // otra base que tenga el mismo número (dev vs. prod, base reseteada).
      idempotencyKey: `brot74-order-${order.id}-${order.publicToken!.slice(0, 16)}`,
      total: order.total,
      items: order.items.map((i) => ({ title: i.product.name, quantity: i.quantity, unitPrice: i.unitPrice })),
      returnUrl: `${req.nextUrl.origin}/confirmacion?order=${order.id}&pago=mp`,
    });

    // Condicionado a que siga pendiente y sin link: si otra llamada ganó la
    // carrera (misma orden de MP por la clave de idempotencia) no se pisa nada.
    await prisma.order.updateMany({
      where: { id: order.id, status: "pending", mpOrderId: null },
      data: {
        paymentMethod: "mp",
        mpOrderId: mpOrder.id,
        paymentExpiresAt: new Date(now.getTime() + MP_PAYMENT_TTL_MINUTES * 60 * 1000),
      },
    });

    return NextResponse.json({ checkoutUrl: mpOrder.checkoutUrl });
  } catch (e) {
    if (e instanceof MercadoPagoError) {
      console.error("Mercado Pago: no se pudo crear el link de pago", { orderId: order.id, status: e.status, body: e.body });
      return NextResponse.json(
        { error: "No pudimos generar el link de pago. Probá de nuevo o pagá por transferencia." },
        { status: 502 }
      );
    }
    throw e;
  }
}
