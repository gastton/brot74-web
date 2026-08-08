export async function sendWhatsAppNotification(message: string): Promise<boolean> {
  const phone = process.env.WHATSAPP_PHONE;
  const apiKey = process.env.WHATSAPP_APIKEY;

  if (!phone || !apiKey) return false;

  try {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${apiKey}`;
    const res = await fetch(url);
    return res.ok;
  } catch {
    console.error("WhatsApp notification failed");
    return false;
  }
}

export function buildOrderMessage(order: {
  id: number;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  total: number;
  isDelivery: boolean;
  slotLabel: string;
  notes?: string;
  items: { name: string; quantity: number; unitPrice: number }[];
}): string {
  const lines = [
    `*Nuevo pedido* 📅 ${order.slotLabel}`,
    `*#${order.id}*`,
    `*Cliente*`,
    `• Nombre: ${order.customerName}`,
    `• Teléfono: ${order.customerPhone}`,
    ``,
    `*Productos:*`,
    ...order.items.map((i) => `• ${i.name} x${i.quantity}`),
  ];
  return lines.join("\n");
}
