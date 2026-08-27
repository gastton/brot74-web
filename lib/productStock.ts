import { prisma } from "@/lib/db";

const DAY_MAP: Record<string, number> = { lunes: 1, miercoles: 3, sabado: 6 };
export const DEFAULT_STOCK = 5;

/**
 * Sincroniza el ProductStock de los slots futuros de un producto según el
 * cambio de días disponibles (prevDays -> newDays): a los días que se agregan
 * les pone stock por defecto (o lo restaura si estaba en 0), y a los días que
 * se quitan les pone el stock en 0. No toca slots que ya pasaron ni días sin
 * cambios. Usado tanto al crear un producto (prevDays vacío) como al editarlo.
 */
export async function syncProductStockForDays(productId: number, prevDays: Set<string>, newDays: Set<string>) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const futureSlots = await prisma.deliverySlot.findMany({ where: { date: { gte: now } } });

  for (const slot of futureSlots) {
    const slotDay = new Date(slot.date).getDay();
    const dayName = Object.entries(DAY_MAP).find(([, v]) => v === slotDay)?.[0];
    if (!dayName) continue;

    const wasAvailable = prevDays.has(dayName);
    const isAvailable = newDays.has(dayName);
    if (wasAvailable === isAvailable) continue; // no change for this day

    const existing = await prisma.productStock.findUnique({
      where: { productId_deliverySlotId: { productId, deliverySlotId: slot.id } },
    });

    if (isAvailable && !wasAvailable) {
      // Activar: si no existe o estaba en 0, poner stock por defecto
      await prisma.productStock.upsert({
        where: { productId_deliverySlotId: { productId, deliverySlotId: slot.id } },
        update: existing?.totalStock === 0 ? { totalStock: DEFAULT_STOCK } : {},
        create: { productId, deliverySlotId: slot.id, totalStock: DEFAULT_STOCK, reservedStock: 0 },
      });
    } else if (!isAvailable && wasAvailable) {
      // Desactivar: poner stock en 0
      await prisma.productStock.upsert({
        where: { productId_deliverySlotId: { productId, deliverySlotId: slot.id } },
        update: { totalStock: 0 },
        create: { productId, deliverySlotId: slot.id, totalStock: 0, reservedStock: 0 },
      });
    }
  }
}
