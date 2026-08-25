import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCutoffPassed } from "@/lib/deliverySlots";

export async function GET() {
  const now = new Date();

  const slots = await prisma.deliverySlot.findMany({
    where: { active: true, date: { gte: now } },
    orderBy: { date: "asc" },
    include: { stocks: true },
  });

  // Get active cart reservations per slot to account for them in hasStock
  const slotIds = slots.map((s) => s.id);
  const cartReservations = await prisma.cartReservation.groupBy({
    by: ["deliverySlotId", "productId"],
    where: { deliverySlotId: { in: slotIds }, expiresAt: { gt: now } },
    _sum: { quantity: true },
  });

  // Map: slotId -> productId -> cartHeld
  const cartMap = new Map<number, Map<number, number>>();
  for (const r of cartReservations) {
    if (!cartMap.has(r.deliverySlotId)) cartMap.set(r.deliverySlotId, new Map());
    cartMap.get(r.deliverySlotId)!.set(r.productId, r._sum.quantity ?? 0);
  }

  const visible = slots
    .filter((slot) => {
      const cutoffPassed = isCutoffPassed(slot, now);
      const slotCartMap = cartMap.get(slot.id) ?? new Map();
      const hasStock = slot.stocks.some((s) => {
        const cartHeld = slotCartMap.get(s.productId) ?? 0;
        return s.totalStock - s.reservedStock - cartHeld > 0;
      });
      return !cutoffPassed && hasStock;
    })
    .slice(0, 2)
    .map((slot) => ({
      id: slot.id,
      date: slot.date.toISOString(),
      dayLabel: slot.dayLabel,
      pickupTime: slot.pickupTime,
      location: slot.location,
      imageUrl: slot.imageUrl,
      imageFocalX: slot.imageFocalX,
      imageFocalY: slot.imageFocalY,
      imageScale: slot.imageScale,
      orderCutoff: slot.orderCutoff,
      disabled: false,
    }));

  return NextResponse.json(visible);
}
