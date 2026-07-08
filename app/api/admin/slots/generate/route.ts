import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const DAY_MAP: Record<number, string> = { 1: "lunes", 6: "sabado" };
const TARGET_DAYS = [1, 6];        // Lunes, Sábado
const DEFAULT_STOCK = 8;

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { year, month } = await req.json(); // month: 1-12

  // Collect all Mon/Wed/Sat in the month
  const dates: Date[] = [];
  const cursor = new Date(year, month - 1, 1);
  while (cursor.getMonth() === month - 1) {
    if (TARGET_DAYS.includes(cursor.getDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Find existing slots in that month to skip duplicates
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  const existing = await prisma.deliverySlot.findMany({
    where: { date: { gte: startOfMonth, lte: endOfMonth } },
  });
  const existingDates = new Set(
    existing.map((s) => {
      const d = new Date(s.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  // Active products for stock init
  const products = await prisma.product.findMany({ where: { active: true } });

  let created = 0;
  let skipped = 0;

  for (const date of dates) {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (existingDates.has(key)) { skipped++; continue; }

    const dayOfWeek = date.getDay();
    const dayName = DAY_MAP[dayOfWeek];

    const label = date
      .toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
      .replace(/^\w/, (c) => c.toUpperCase());

    // Noon to avoid timezone shift
    const slotDate = new Date(date);
    slotDate.setHours(12, 0, 0, 0);

    const slot = await prisma.deliverySlot.create({
      data: { date: slotDate, dayLabel: label, deliveryMode: "pickup", active: true },
    });

    // Init stock for products that have this day available
    for (const product of products) {
      const days = (product.availableDays ?? "").split(",").filter(Boolean);
      if (dayName && days.includes(dayName)) {
        await prisma.productStock.create({
          data: { productId: product.id, deliverySlotId: slot.id, totalStock: DEFAULT_STOCK, reservedStock: 0 },
        });
      }
    }

    created++;
  }

  return NextResponse.json({ created, skipped });
}
