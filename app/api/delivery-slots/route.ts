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

  const visible = slots
    .filter((slot) => {
      const cutoffPassed = isCutoffPassed(slot, now);
      const hasStock = slot.stocks.some((s) => s.totalStock - s.reservedStock > 0);
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
