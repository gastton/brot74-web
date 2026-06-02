import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CUTOFF_HOURS = 20;

function getWeekDates(weekOffset = 0): { monday: Date; saturday: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const daysToMonday = dow === 0 ? 1 : -(dow - 1);

  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday + weekOffset * 7);
  monday.setHours(12, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  return { monday, saturday };
}

function isExpired(slotDate: Date, now: Date): boolean {
  const cutoff = new Date(slotDate.getTime() - CUTOFF_HOURS * 60 * 60 * 1000);
  return now >= cutoff;
}

async function findSlotForDate(date: Date) {
  const start = new Date(date); start.setUTCHours(0, 0, 0, 0);
  const end   = new Date(date); end.setUTCHours(23, 59, 59, 999);
  return prisma.deliverySlot.findFirst({
    where: { date: { gte: start, lte: end }, active: true },
  });
}

export async function GET() {
  const now = new Date();
  let week = getWeekDates(0);
  const { monday, saturday } = week;

  const allClosed = isExpired(monday, now) && isExpired(saturday, now);
  const { monday: mon, saturday: sat } = allClosed ? getWeekDates(1) : week;

  const [mondaySlot, saturdaySlot] = await Promise.all([
    findSlotForDate(mon),
    findSlotForDate(sat),
  ]);

  function buildEntry(date: Date, slot: Awaited<ReturnType<typeof findSlotForDate>>) {
    const label = slot?.dayLabel ?? date.toLocaleDateString("es-AR", {
      weekday: "long", day: "numeric", month: "long",
    }).replace(/^\w/, (c) => c.toUpperCase());

    return {
      id: slot?.id ?? null,
      date: date.toISOString(),
      dayLabel: label,
      deliveryMode: slot?.deliveryMode ?? "pickup",
      pickupTime: slot?.pickupTime ?? "",
      location: slot?.location ?? "",
      disabled: isExpired(date, now) || !slot,
    };
  }

  return NextResponse.json([
    buildEntry(mon, mondaySlot),
    buildEntry(sat, saturdaySlot),
  ]);
}
