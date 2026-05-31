import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CUTOFF_HOURS = 20;  // horas antes del slot en que se cierran los pedidos

// Computes Mon/Wed/Sat at noon for a given week offset (0 = this week, 1 = next week)
function getWeekDates(weekOffset = 0): { monday: Date; wednesday: Date; saturday: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun

  // Distance to this week's Monday
  const daysToMonday = dow === 0 ? 1 : -(dow - 1);

  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday + weekOffset * 7);
  monday.setHours(12, 0, 0, 0); // noon — matches slot generation

  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  return { monday, wednesday, saturday };
}

function isExpired(slotDate: Date, now: Date): boolean {
  // Pasó el cutoff → ya no se puede pedir
  const cutoff = new Date(slotDate.getTime() - CUTOFF_HOURS * 60 * 60 * 1000);
  return now >= cutoff;
}


async function findSlotForDate(date: Date) {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end   = new Date(date); end.setHours(23, 59, 59, 999);
  return prisma.deliverySlot.findFirst({
    where: { date: { gte: start, lte: end }, active: true },
  });
}

export async function GET() {
  const now = new Date();

  // Try this week; if all slots are closed, advance to next week
  let week = getWeekDates(0);
  const { monday, wednesday, saturday } = week;

  // Avanzar a la semana siguiente solo cuando TODOS los slots expiraron
  const allClosed =
    isExpired(monday, now) &&
    isExpired(wednesday, now) &&
    isExpired(saturday, now);

  const { monday: mon, wednesday: wed, saturday: sat } = allClosed
    ? getWeekDates(1)
    : week;

  const [mondaySlot, wednesdaySlot, saturdaySlot] = await Promise.all([
    findSlotForDate(mon),
    findSlotForDate(wed),
    findSlotForDate(sat),
  ]);

  function buildEntry(date: Date, slot: Awaited<ReturnType<typeof findSlotForDate>>, isDelivery: boolean) {
    const label = slot?.dayLabel ?? date.toLocaleDateString("es-AR", {
      weekday: "long", day: "numeric", month: "long",
    }).replace(/^\w/, (c) => c.toUpperCase());

    return {
      id: slot?.id ?? null,
      date: date.toISOString(),
      dayLabel: label,
      isDelivery,
      disabled: isExpired(date, now) || !slot,
    };
  }

  return NextResponse.json([
    buildEntry(mon, mondaySlot,    false),
    buildEntry(wed, wednesdaySlot, false),
    buildEntry(sat, saturdaySlot,  true),
  ]);
}
