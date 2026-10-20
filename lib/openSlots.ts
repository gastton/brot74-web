import { prisma } from "@/lib/db";
import { isCutoffPassed } from "@/lib/deliverySlots";

/**
 * Fechas abiertas para pedir: activas, futuras, con el cierre sin vencer y con
 * stock. Única fuente de verdad: la usan /api/delivery-slots (flujo de pedidos)
 * y la landing (estado "Pedidos abiertos / cerrados", v59), así ambos coinciden.
 */
export async function getOpenSlots(now: Date, limit = 2) {
  const slots = await prisma.deliverySlot.findMany({
    where: { active: true, date: { gte: now } },
    orderBy: { date: "asc" },
    include: { stocks: true },
  });

  return slots
    .filter((slot) => {
      const cutoffPassed = isCutoffPassed(slot, now);
      const hasStock = slot.stocks.some((s) => s.totalStock - s.reservedStock > 0);
      return !cutoffPassed && hasStock;
    })
    .slice(0, limit);
}
