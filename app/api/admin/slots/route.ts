import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NEW_SLOT_STOCK } from "@/lib/productStock";
import { isDeliveryMode } from "@/lib/deliveryMode";

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

  // Retiro o delivery: se elige solo al crear la fecha (el PUT no lo cambia).
  const deliveryMode = data.deliveryMode ?? "pickup";
  if (!isDeliveryMode(deliveryMode)) {
    return NextResponse.json({ error: "Tipo de entrega inválido" }, { status: 400 });
  }

  const slot = await prisma.deliverySlot.create({
    data: {
      date: new Date(data.date + "T12:00:00Z"),
      dayLabel: data.dayLabel,
      deliveryMode,
      pickupTime: data.pickupTime ?? "",
      location: data.location ?? "",
      imageUrl: data.imageUrl ?? "",
      imageFocalX: data.imageFocalX ?? 50,
      imageFocalY: data.imageFocalY ?? 50,
      imageScale: data.imageScale ?? 1,
      orderCutoff: data.orderCutoff ? new Date(data.orderCutoff) : null,
      active: data.active ?? true,
    },
  });

  const products = await prisma.product.findMany({ where: { active: true } });
  await prisma.productStock.createMany({
    data: products.map((p) => ({ productId: p.id, deliverySlotId: slot.id, totalStock: NEW_SLOT_STOCK, reservedStock: 0 })),
  });

  return NextResponse.json(slot, { status: 201 });
}
