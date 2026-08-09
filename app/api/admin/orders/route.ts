import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const slotId = req.nextUrl.searchParams.get("slotId");

  const orders = await prisma.order.findMany({
    where: slotId ? { deliverySlotId: parseInt(slotId) } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      deliverySlot: { select: { dayLabel: true, date: true } },
      items: {
        include: { product: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerAddress: o.customerAddress,
      status: o.status,
      total: o.total,
      notes: o.notes,
      slotLabel: o.deliverySlot.dayLabel,
      slotDate: o.deliverySlot.date,
      createdAt: o.createdAt,
      items: o.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    }))
  );
}
