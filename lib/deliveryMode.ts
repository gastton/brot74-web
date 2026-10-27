/**
 * Cómo se hace el cliente de su pan en una fecha: retiro en el local o
 * delivery. Se elige al crear la fecha (admin, Nueva fecha) y no se cambia
 * después. El schema todavía admite "both" (de una versión vieja); se trata
 * como retiro.
 */

export const DELIVERY_MODES = ["pickup", "delivery"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export function isDeliveryMode(value: unknown): value is DeliveryMode {
  return typeof value === "string" && (DELIVERY_MODES as readonly string[]).includes(value);
}

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, { name: string; time: string; place: string; placePlaceholder: string }> = {
  pickup: {
    name: "Retiro",
    time: "Horario de retiro",
    place: "Lugar de retiro",
    placePlaceholder: "Ej: Av. Corrientes 1234, CABA",
  },
  delivery: {
    name: "Entrega",
    time: "Horario de entrega",
    place: "Zona de entrega",
    placePlaceholder: "Ej: El Talar y alrededores",
  },
};

export function deliveryModeLabels(mode: string) {
  return DELIVERY_MODE_LABELS[mode === "delivery" ? "delivery" : "pickup"];
}
