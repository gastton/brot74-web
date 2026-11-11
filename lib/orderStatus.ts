// Estados del pedido y qué cambios se permiten entre ellos. Lo usan el PATCH
// de /api/admin/orders/[id] (que rechaza lo que no se permite) y el
// desplegable de Pedidos del admin (que deshabilita esas opciones).

// Camino normal, en orden. Solo se avanza: un pedido Preparando ya está
// pagado, así que no puede volver a Pendiente ni a Pagado.
export const ORDER_FLOW = ["pending", "paid", "preparing", "ready", "delivered"] as const;

export const ORDER_STATUSES = [...ORDER_FLOW, "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Estados con el pago ya confirmado.
export const PAID_STATUSES: readonly string[] = ["paid", "preparing", "ready", "delivered"];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * ¿Se puede pasar de `from` a `to`?
 * - Mismo estado: sí (no cambia nada).
 * - Dentro del camino normal: solo hacia adelante (se pueden saltear pasos).
 * - Cancelar: desde cualquier estado menos Entregado.
 * - Desde Cancelado: solo a Pendiente (reactivar; vuelve a reservar stock).
 */
export function canTransition(from: string, to: string): boolean {
  if (from === to) return true;
  if (to === "cancelled") return from !== "delivered";
  if (from === "cancelled") return to === "pending";

  const fromIdx = ORDER_FLOW.indexOf(from as (typeof ORDER_FLOW)[number]);
  const toIdx = ORDER_FLOW.indexOf(to as (typeof ORDER_FLOW)[number]);
  return fromIdx !== -1 && toIdx > fromIdx;
}
