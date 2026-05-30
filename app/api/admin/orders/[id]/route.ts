import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  const validStatuses = ["pending", "paid", "preparing", "ready", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id: parseInt(id) },
    data: { status },
    include: { items: true },
  });

  // Release stock if cancelled
  if (status === "cancelled") {
    for (const item of order.items) {
      await prisma.productStock.updateMany({
        where: { productId: item.productId, deliverySlotId: order.deliverySlotId },
        data: { reservedStock: { decrement: item.quantity } },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
