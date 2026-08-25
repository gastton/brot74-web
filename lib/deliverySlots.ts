/**
 * Lógica de cutoff de pedidos, compartida entre /api/delivery-slots (para
 * ocultar fechas vencidas del listado público) y /api/orders (BRT-114: la
 * misma regla debe aplicarse server-side al confirmar un pedido, no solo
 * para decidir qué se muestra en el front).
 */

export const CUTOFF_HOURS = 20;

export function isCutoffPassed(
  slot: { date: Date; orderCutoff: Date | null },
  now: Date
): boolean {
  if (slot.orderCutoff) return now >= slot.orderCutoff;
  const cutoff = new Date(slot.date.getTime() - CUTOFF_HOURS * 60 * 60 * 1000);
  return now >= cutoff;
}
