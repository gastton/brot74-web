import { formatCurrency } from "@/lib/utils";

// BRT-265: links wa.me para avisarle al cliente a mano (sin servicio pago
// de mensajes). El admin toca el botón, se abre WhatsApp con el texto ya
// escrito y lo envía él.

/**
 * Teléfono tal como lo cargó el cliente ("11 1234-5678", "+54 9 351…",
 * "0351 15…", "0054 9 11…") → número internacional de celular argentino
 * para wa.me (549 + código de área + número = 13 dígitos).
 *
 * El número nacional argentino tiene 10 dígitos (área + abonado). Si después
 * de sacar prefijos no quedan 10 (por ejemplo, falta el código de área)
 * devuelve null: no se muestra un link que no llegaría a nadie y el admin
 * contacta al cliente a mano.
 */
export function toWhatsAppNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2); // prefijo internacional
  if (digits.startsWith("54")) digits = digits.slice(2); // país
  if (digits.length === 11 && digits.startsWith("9")) digits = digits.slice(1); // 9 de celular
  if (digits.startsWith("0")) digits = digits.slice(1); // 0 de larga distancia
  if (digits.length === 12) digits = stripLocal15(digits);
  return digits.length === 10 ? `549${digits}` : null;
}

/**
 * "15" de celular local, que va justo después del código de área (2 a 4
 * dígitos: 11, 351, 2944). Solo se saca en ese límite; otros "15" del
 * número quedan como están.
 */
function stripLocal15(digits: string): string {
  for (const areaLength of [2, 3, 4]) {
    if (digits.slice(areaLength, areaLength + 2) === "15") {
      return digits.slice(0, areaLength) + digits.slice(areaLength + 2);
    }
  }
  return digits;
}

/**
 * Teléfono del checkout: tiene que servir para WhatsApp (código de área +
 * número; acepta 0, 15, +54 y 9). Lo validan el formulario y POST /api/orders,
 * así el botón "Avisar por WhatsApp" del admin siempre tiene un número.
 */
export function isValidCustomerPhone(phone: unknown): boolean {
  return typeof phone === "string" && toWhatsAppNumber(phone) !== null;
}

export const PHONE_EXAMPLE = "351 123 4567";
export const INVALID_PHONE_MESSAGE = `Ingresá tu WhatsApp con código de área, por ejemplo ${PHONE_EXAMPLE}`;

/** Link wa.me con el texto ya escrito, o null si el teléfono no sirve. */
export function whatsAppLink(phone: string, text: string): string | null {
  const number = toWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

/**
 * Aviso de pago recibido con el detalle del pedido. "Nos vemos el…" (y no
 * "Te esperamos") porque sirve tanto para retiro como para entrega. Viñetas
 * con "•": en WhatsApp el "*" marca negrita.
 */
export function paymentReceivedMessage(order: {
  id: number;
  customerName: string;
  total: number;
  slotLabel: string;
  items: { name: string; quantity: number }[];
}): string {
  const firstName = order.customerName.trim().split(/\s+/)[0] ?? "";
  return [
    `¡Hola ${firstName}! Recibimos tu pago de ${formatCurrency(order.total)} correspondiente al pedido #${order.id}:`,
    "",
    ...order.items.map((i) => `• ${i.quantity} × ${i.name}`),
    "",
    `Nos vemos el ${order.slotLabel}.`,
    "¡Muchas gracias! 🍞",
    "BROT 74",
  ].join("\n");
}
