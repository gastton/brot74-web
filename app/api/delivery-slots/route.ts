import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Returns Mon=1, Wed=3, Sat=6 dates for the current week.
// If today is Sunday, returns next week's dates.
function getWeekTargetDates(): { monday: Date; wednesday: Date; saturday: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // Sunday → jump to next week's Monday
  const daysToMonday = dow === 0 ? 1 : -(dow - 1);

  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);

  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  return { monday, wednesday, saturday };
}

async function findSlotForDate(date: Date) {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end   = new Date(date); end.setHours(23, 59, 59, 999);
  return prisma.deliverySlot.findFirst({
    where: { date: { gte: start, lte: end }, active: true },
  });
}

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { monday, wednesday, saturday } = getWeekTargetDates();

  const [mondaySlot, wednesdaySlot, saturdaySlot] = await Promise.all([
    findSlotForDate(monday),
    findSlotForDate(wednesday),
    findSlotForDate(saturday),
  ]);

  function buildEntry(date: Date, slot: Awaited<ReturnType<typeof findSlotForDate>>, isDelivery: boolean) {
    const isPast = date < today;
    const label = slot?.dayLabel ?? date.toLocaleDateString("es-AR", {
      weekday: "long", day: "numeric", month: "long",
    }).replace(/^\w/, (c) => c.toUpperCase());

    return {
      id: slot?.id ?? null,
      date: date.toISOString(),
      dayLabel: label,
      isDelivery,
      disabled: isPast || !slot,
    };
  }

  return NextResponse.json([
    buildEntry(monday,    mondaySlot,    false),
    buildEntry(wednesday, wednesdaySlot, false),
    buildEntry(saturday,  saturdaySlot,  true),
  ]);
}
