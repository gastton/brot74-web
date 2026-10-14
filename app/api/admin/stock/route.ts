import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const slotId = req.nextUrl.searchParams.get("slotId");

  const stock = await prisma.productStock.findMany({
    where: slotId ? { deliverySlotId: parseInt(slotId) } : undefined,
    include: {
      product: { select: { id: true, name: true } },
      deliverySlot: { select: { id: true, dayLabel: true, date: true } },
    },
  });

  return NextResponse.json(
    stock.map((s) => ({
      id: s.id,
      productId: s.productId,
      productName: s.product.name,
      deliverySlotId: s.deliverySlotId,
      slotLabel: s.deliverySlot.dayLabel,
      slotDate: s.deliverySlot.date,
      totalStock: s.totalStock,
      reservedStock: s.reservedStock,
      available: s.totalStock - s.reservedStock,
    }))
  );
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { productId, deliverySlotId, totalStock } = await req.json();

  // Sin esto, un valor negativo, decimal o no numérico llegaba a la base
  // (o explotaba en Prisma con un 500) y dejaba el disponible en negativo.
  if (!Number.isInteger(productId) || !Number.isInteger(deliverySlotId) || !Number.isInteger(totalStock) || totalStock < 0) {
    return NextResponse.json({ error: "Datos inválidos: el stock debe ser un número entero mayor o igual a 0" }, { status: 400 });
  }

  const stock = await prisma.productStock.upsert({
    where: { productId_deliverySlotId: { productId, deliverySlotId } },
    update: { totalStock },
    create: { productId, deliverySlotId, totalStock, reservedStock: 0 },
  });

  return NextResponse.json(stock);
}
