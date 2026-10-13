/**
 * Lógica de cutoff de pedidos, compartida entre /api/delivery-slots (para
 * ocultar fechas vencidas del listado público) y /api/orders (BRT-114: la
 * misma regla debe aplicarse server-side al confirmar un pedido, no solo
 * para decidir qué se muestra en el front).
 *
 * Dos momentos distintos (sin reserva de stock por tiempo):
 * - Cierre ("Pedidos hasta"): la fecha deja de mostrarse y los que llegan
 *   después van a la lista de espera.
 * - Cierre + tolerancia: quien ya estaba en el flujo (carrito armado o en la
 *   pantalla de pago) todavía puede confirmar "Ya transferí". Es el colchón
 *   hasta que se revisan a mano los pedidos pagados; los `pending` sin pagar
 *   se descartan en ese momento.
 */

export const CUTOFF_HOURS = 20;

// Horas después del cierre en las que /api/orders todavía acepta pedidos.
export const ORDER_GRACE_HOURS = 24;

export function isCutoffPassed(
  slot: { date: Date; orderCutoff: Date | null },
  now: Date
): boolean {
  if (slot.orderCutoff) return now >= slot.orderCutoff;
  const cutoff = new Date(slot.date.getTime() - CUTOFF_HOURS * 60 * 60 * 1000);
  return now >= cutoff;
}

export function isOrderingClosed(
  slot: { date: Date; orderCutoff: Date | null },
  now: Date
): boolean {
  const cutoff = slot.orderCutoff ?? new Date(slot.date.getTime() - CUTOFF_HOURS * 60 * 60 * 1000);
  return now.getTime() >= cutoff.getTime() + ORDER_GRACE_HOURS * 60 * 60 * 1000;
}
