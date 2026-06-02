import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  const slot = await prisma.deliverySlot.update({
    where: { id: parseInt(id) },
    data: {
      dayLabel: data.dayLabel,
      deliveryMode: data.deliveryMode ?? "pickup",
      pickupTime: data.pickupTime ?? "",
      location: data.location ?? "",
      imageUrl: data.imageUrl ?? "",
      orderCutoff: data.orderCutoff ? new Date(data.orderCutoff) : null,
      active: data.active,
    },
  });
  return NextResponse.json(slot);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.deliverySlot.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
