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

/**
 * "Pedidos hasta" se elige en el admin como un día y una hora (hora de
 * Argentina, UTC-3, sin horario de verano). Sin hora, cierra ese día a las
 * 13:00. Antes se guardaba "YYYY-MM-DD" tal cual = 00:00 UTC = 21:00 del día
 * anterior en Argentina, y la web mostraba un día menos que el admin.
 */
export const AR_TIME_ZONE = "America/Argentina/Buenos_Aires";
const AR_OFFSET = "-03:00";
export const DEFAULT_CUTOFF_TIME = "13:00";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_AR = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// "YYYY-MM-DD" → ese día a las 13:00 AR; "YYYY-MM-DDTHH:mm" (lo que manda el
// admin con la hora cargada) → ese día y hora en AR. Un ISO completo (el valor
// ya guardado, que el admin reenvía al editar otros campos) se respeta tal
// cual. Devuelve undefined si no es una fecha válida.
export function parseOrderCutoff(value: unknown): Date | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  let iso = value;
  if (DATE_ONLY.test(value)) iso = `${value}T${DEFAULT_CUTOFF_TIME}:00${AR_OFFSET}`;
  else if (DATE_TIME_AR.test(value)) iso = `${value}:00${AR_OFFSET}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Día de "Pedidos hasta" en Argentina, como "YYYY-MM-DD" (valor del input del admin).
export function orderCutoffDay(cutoff: Date | string): string {
  return new Date(cutoff).toLocaleDateString("en-CA", { timeZone: AR_TIME_ZONE });
}

// Hora de "Pedidos hasta" en Argentina, como "HH:mm" (valor del input del admin).
export function orderCutoffTime(cutoff: Date | string): string {
  return new Date(cutoff).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: AR_TIME_ZONE });
}

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
