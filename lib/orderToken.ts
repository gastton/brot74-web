import { randomBytes, timingSafeEqual } from "node:crypto";

// BRT-251: los IDs de pedido son correlativos, así que no alcanzan para saber
// que quien pide el link de pago (o, en BRT-257, el estado) es quien hizo el
// pedido. POST /api/orders genera este token y lo devuelve solo a ese cliente.

export function generateOrderToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Comparación en tiempo constante. Pedidos viejos sin token nunca coinciden. */
export function orderTokenMatches(stored: string | null, given: unknown): boolean {
  if (!stored || typeof given !== "string") return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}
