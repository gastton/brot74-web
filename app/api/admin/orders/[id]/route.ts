import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

class InsufficientStockError extends Error {
  constructor(public productId: number) {
    super(`Stock insuficiente para reactivar el pedido (producto ${productId})`);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  const validStatuses = ["pending", "paid", "preparing", "ready", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const orderId = parseInt(id);

  const current = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!current) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  // BRT-111: el ajuste de stock solo debe ocurrir en la transición
  // hacia/desde "cancelled", no cada vez que llega status: "cancelled" en
  // el PATCH — cancelar dos veces el mismo pedido no debe liberar stock
  // dos veces.
  const wasCancelled = current.status === "cancelled";
  const willBeCancelled = status === "cancelled";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status } });

      if (willBeCancelled && !wasCancelled) {
        // Cancelando por primera vez: liberar el stock reservado.
        for (const item of current.items) {
          await tx.productStock.updateMany({
            where: { productId: item.productId, deliverySlotId: current.deliverySlotId },
            data: { reservedStock: { decrement: item.quantity } },
          });
        }
      } else if (!willBeCancelled && wasCancelled) {
        // Reactivando un pedido cancelado: volver a reservar el stock,
        // de forma atómica y solo si hay capacidad disponible en este
        // momento (mismo patrón que BRT-109 en /api/orders). Orden
        // consistente por productId para evitar deadlocks con otras
        // transacciones concurrentes.
        const sortedItems = [...current.items].sort((a, b) => a.productId - b.productId);

        for (const item of sortedItems) {
          const affected = await tx.$executeRaw`
            UPDATE "ProductStock"
            SET "reservedStock" = "reservedStock" + ${item.quantity}
            WHERE "productId" = ${item.productId}
              AND "deliverySlotId" = ${current.deliverySlotId}
              AND "totalStock" - "reservedStock" >= ${item.quantity}
          `;

          if (affected === 0) {
            throw new InsufficientStockError(item.productId);
          }
        }
      }
      // Si willBeCancelled === wasCancelled (incluye "cancelar" un pedido
      // ya cancelado), no se toca el stock: la operación es idempotente.
    });
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: "No hay stock suficiente para reactivar este pedido" },
        { status: 409 }
      );
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
