import { prisma } from "@/lib/db";

// BRT-256: pedidos de Mercado Pago que vencieron sin pagarse.
//
// Un pedido reserva stock al crearse. Si el cliente generó el link de MP y no
// pagó, a los MP_PAYMENT_TTL_MINUTES la orden de MP vence, pero el pedido
// seguiría pendiente y reteniendo ese pan para siempre. Esto lo cancela y
// devuelve el stock, como hace el admin al cancelar a mano.
//
// No hay un proceso programado (los crons gratis de Vercel corren una vez por
// día): se llama justo antes de leer o usar el stock (productos, fechas
// abiertas, crear pedido, listados del admin). Así lo disponible nunca incluye
// pedidos vencidos.
//
// Margen: MP vence la orden a los 30 minutos, pero el aviso de un pago hecho
// en el último segundo puede tardar en llegar. Se espera un rato más antes de
// cancelar para no ganarle al webhook. Si igual llega un pago de un pedido ya
// cancelado, el webhook no lo confirma y lo deja en los logs (BRT-255).
export const EXPIRED_MP_GRACE_MINUTES = 10;

/** Cancela los pedidos de MP vencidos y devuelve su stock. Devuelve los IDs cancelados. */
export async function cancelExpiredMpOrders(now = new Date()): Promise<number[]> {
  const cutoff = new Date(now.getTime() - EXPIRED_MP_GRACE_MINUTES * 60 * 1000);

  const expired = await prisma.order.findMany({
    where: { status: "pending", paymentMethod: "mp", paymentExpiresAt: { lt: cutoff } },
    select: { id: true },
  });

  const cancelled: number[] = [];
  for (const { id } of expired) {
    const done = await prisma.$transaction(async (tx) => {
      // Condicionado: si el webhook lo confirmó, el admin lo tocó u otra
      // llamada lo canceló primero, no se hace nada (ni se devuelve stock dos veces).
      const { count } = await tx.order.updateMany({
        where: { id, status: "pending", paymentMethod: "mp", paymentExpiresAt: { lt: cutoff } },
        data: { status: "cancelled" },
      });
      if (count === 0) return false;

      const order = await tx.order.findUniqueOrThrow({
        where: { id },
        // Mismo orden por productId que /api/orders, para no trabarse con un pedido en curso.
        include: { items: { orderBy: { productId: "asc" } } },
      });
      for (const item of order.items) {
        await tx.productStock.updateMany({
          where: { productId: item.productId, deliverySlotId: order.deliverySlotId },
          data: { reservedStock: { decrement: item.quantity } },
        });
      }
      return true;
    });
    if (done) cancelled.push(id);
  }

  if (cancelled.length > 0) {
    console.info("Mercado Pago: pedidos vencidos sin pago cancelados", { orderIds: cancelled });
  }
  return cancelled;
}

/**
 * Para las rutas que leen stock: la limpieza nunca hace fallar la página o el
 * pedido. Si falla, se registra y se sigue (se reintenta en la próxima lectura).
 */
export async function sweepExpiredMpOrders(): Promise<void> {
  try {
    await cancelExpiredMpOrders();
  } catch (err) {
    console.error("No se pudieron cancelar los pedidos de MP vencidos", err);
  }
}
