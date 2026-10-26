import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseOrderCutoff } from "@/lib/deliverySlots";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const slotId = parseId((await params).id);
  if (slotId === null) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  const data = await req.json();

  // Actualización parcial: solo se tocan los campos que vienen en el body.
  // Antes, cualquier campo ausente se pisaba con su valor por defecto — por
  // ejemplo, habilitar/deshabilitar una fecha (que solo manda `active`)
  // dejaba vacíos "Pedidos hasta", el horario, el lugar y la imagen.
  // deliveryMode (retiro/delivery) no se toca acá: se elige solo al crear la fecha.
  const update: Prisma.DeliverySlotUpdateInput = {};
  if (data.dayLabel !== undefined) update.dayLabel = data.dayLabel;
  if ("pickupTime" in data) update.pickupTime = data.pickupTime ?? "";
  if ("location" in data) update.location = data.location ?? "";
  if ("imageUrl" in data) update.imageUrl = data.imageUrl ?? "";
  if ("imageFocalX" in data) update.imageFocalX = data.imageFocalX ?? 50;
  if ("imageFocalY" in data) update.imageFocalY = data.imageFocalY ?? 50;
  if ("imageScale" in data) update.imageScale = data.imageScale ?? 1;
  if ("orderCutoff" in data) {
    const orderCutoff = parseOrderCutoff(data.orderCutoff);
    if (orderCutoff === undefined) {
      return NextResponse.json({ error: "\"Pedidos hasta\" inválido" }, { status: 400 });
    }
    update.orderCutoff = orderCutoff;
  }
  if (data.active !== undefined) update.active = data.active;

  try {
    const slot = await prisma.deliverySlot.update({ where: { id: slotId }, data: update });
    return NextResponse.json(slot);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Fecha no encontrada" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const slotId = parseId((await params).id);
  if (slotId === null) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

  const slot = await prisma.deliverySlot.findUnique({
    where: { id: slotId },
    include: { _count: { select: { orders: true } } },
  });
  if (!slot) return NextResponse.json({ error: "Fecha no encontrada" }, { status: 404 });

  // Order → DeliverySlot no tiene cascade: borrar una fecha con pedidos
  // violaba la clave foránea y devolvía un 500. Se avisa con un 409 claro; la
  // fecha se puede deshabilitar (queda archivada) sin perder los pedidos.
  const orderCount = slot._count.orders;
  if (orderCount > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar: la fecha tiene ${orderCount} pedido${orderCount !== 1 ? "s" : ""}. Deshabilitala y queda archivada.`,
      },
      { status: 409 }
    );
  }

  await prisma.deliverySlot.delete({ where: { id: slotId } });
  return NextResponse.json({ ok: true });
}
