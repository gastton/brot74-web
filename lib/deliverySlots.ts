/**
 * Lógica de cutoff de pedidos, compartida entre /api/delivery-slots (para
 * ocultar fechas vencidas del listado público) y /api/orders (BRT-114: la
 * misma regla debe aplicarse server-side al confirmar un pedido, no solo
 * para decidir qué se muestra en el front).
 *
 * Dos momentos distintos (sin reserva de stock por tiempo):
 * - Cierre ("Pedidos hasta"): la fecha deja de mostrarse y los que llegan
 *   después van a la lista de espera.
 * - Cierre + tolerancia: quien ya estaba en el flujo (carrito armado) todavía
 *   puede tocar "Pagar", que es cuando se crea el pedido. Es el colchón
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

/**
 * Archivo de fechas en el admin (Fechas, Pedidos, Dashboard). Funciones puras
 * que aceptan fechas como Date o string ISO (el admin las recibe como JSON).
 *
 * - Fechas se archiva al cerrar "Pedidos hasta" (la fecha ya no se gestiona).
 * - Pedidos y Dashboard esperan a que pase el día de retiro: entre el cierre y
 *   la entrega todavía hay que revisar pagos, hornear y entregar esos pedidos.
 */
type SlotDates = { date: Date | string; orderCutoff: Date | string | null };

// El slot guarda la fecha a las 12:00 UTC. Pasadas 12 h (≈ 21:00 en Argentina,
// después del horario de retiro) se considera que el día de retiro terminó;
// no depende de la zona horaria de quien lo evalúa (servidor o navegador).
const PICKUP_DAY_END_HOURS = 12;

export function isPickupPast(slot: SlotDates, now: Date): boolean {
  return now.getTime() >= new Date(slot.date).getTime() + PICKUP_DAY_END_HOURS * 60 * 60 * 1000;
}

export function isSlotArchived(slot: SlotDates, now: Date): boolean {
  const normalized = {
    date: new Date(slot.date),
    orderCutoff: slot.orderCutoff ? new Date(slot.orderCutoff) : null,
  };
  return isCutoffPassed(normalized, now) || isPickupPast(slot, now);
}
