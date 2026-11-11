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

export function paymentReceivedMessage(order: { id: number; customerName: string; slotLabel: string }): string {
  const firstName = order.customerName.trim().split(/\s+/)[0] ?? "";
  return `¡Hola ${firstName}! Recibimos tu pago del pedido #${order.id} de BROT.74 para el ${order.slotLabel}. ¡Gracias!`;
}
