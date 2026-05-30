import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const DAY_MAP: Record<string, number> = { lunes: 1, miercoles: 3, sabado: 6 };
const DEFAULT_STOCK = 5;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const productId = parseInt(id);
  const data = await req.json();

  const prevProduct = await prisma.product.findUnique({ where: { id: productId } });
  const prevDays = new Set((prevProduct?.availableDays ?? "").split(",").filter(Boolean));
  const newDays = new Set((data.availableDays ?? "").split(",").filter(Boolean));

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      name: data.name,
      description: data.description,
      price: parseInt(data.price),
      weight: data.weight,
      ingredients: data.ingredients,
      imageUrl: data.imageUrl,
      focalX: data.focalX ?? 50,
      focalY: data.focalY ?? 50,
      availableDays: data.availableDays ?? "",
      active: data.active,
      sortOrder: data.sortOrder,
    },
  });

  // Apply day changes to all future slots
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const futureSlots = await prisma.deliverySlot.findMany({ where: { date: { gte: now } } });

  for (const slot of futureSlots) {
    const slotDay = new Date(slot.date).getDay();
    const dayName = Object.entries(DAY_MAP).find(([, v]) => v === slotDay)?.[0];
    if (!dayName) continue;

    const wasAvailable = prevDays.has(dayName);
    const isAvailable = newDays.has(dayName);

    if (wasAvailable === isAvailable) continue; // no change for this day

    const existing = await prisma.productStock.findUnique({
      where: { productId_deliverySlotId: { productId, deliverySlotId: slot.id } },
    });

    if (isAvailable && !wasAvailable) {
      // Activar: si no existe o estaba en 0, poner stock por defecto
      await prisma.productStock.upsert({
        where: { productId_deliverySlotId: { productId, deliverySlotId: slot.id } },
        update: existing?.totalStock === 0 ? { totalStock: DEFAULT_STOCK } : {},
        create: { productId, deliverySlotId: slot.id, totalStock: DEFAULT_STOCK, reservedStock: 0 },
      });
    } else if (!isAvailable && wasAvailable) {
      // Desactivar: poner stock en 0
      await prisma.productStock.upsert({
        where: { productId_deliverySlotId: { productId, deliverySlotId: slot.id } },
        update: { totalStock: 0 },
        create: { productId, deliverySlotId: slot.id, totalStock: 0, reservedStock: 0 },
      });
    }
  }

  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.product.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
