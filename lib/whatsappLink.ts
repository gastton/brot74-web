import { formatCurrency } from "@/lib/utils";

// BRT-265: links wa.me para avisarle al cliente a mano (sin servicio pago
// de mensajes). El admin toca el botón, se abre WhatsApp con el texto ya
// escrito y lo envía él.

/**
 * Teléfono tal como lo cargó el cliente ("11 1234-5678", "+54 9 351…",
 * "0351 15…") → número internacional de celular argentino para wa.me
 * (549 + código de área + número). Devuelve null si no hay dígitos.
 */
export function toWhatsAppNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return `549${digits}`;
}

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
