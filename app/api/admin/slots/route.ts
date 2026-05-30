import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const slots = await prisma.deliverySlot.findMany({
    orderBy: { date: "asc" },
    include: {
      stocks: {
        include: { product: { select: { name: true } } },
      },
    },
  });
  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const data = await req.json();
  const slot = await prisma.deliverySlot.create({
    data: {
      date: new Date(data.date),
      dayLabel: data.dayLabel,
      isDelivery: data.isDelivery ?? false,
      active: data.active ?? true,
    },
  });

  // Create default stock entries for all active products
  const products = await prisma.product.findMany({ where: { active: true } });
  for (const p of products) {
    await prisma.productStock.create({
      data: { productId: p.id, deliverySlotId: slot.id, totalStock: 0, reservedStock: 0 },
    });
  }

  return NextResponse.json(slot, { status: 201 });
}
