import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sweepExpiredMpOrders } from "@/lib/expiredMpOrders";

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // BRT-256: liberar el stock de pedidos de MP vencidos antes de leerlo.
  await sweepExpiredMpOrders();

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
      // BRT-264: "alias" (confirmación manual) | "mp" (confirmado por webhook).
      // Los IDs internos de MP (preferencia/pago) no se exponen.
      paymentMethod: o.paymentMethod,
      paidAt: o.paidAt,
      deliveredAt: o.deliveredAt,
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
