import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CUTOFF_HOURS = 20;

function isCutoffPassed(slot: { date: Date; orderCutoff: Date | null }, now: Date): boolean {
  if (slot.orderCutoff) return now >= slot.orderCutoff;
  const cutoff = new Date(slot.date.getTime() - CUTOFF_HOURS * 60 * 60 * 1000);
  return now >= cutoff;
}

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
      deliveryMode: slot.deliveryMode,
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
