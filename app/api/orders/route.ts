import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { effectivePrice } from "@/lib/pricing";
import { normalizeCartItems, MAX_PER_PRODUCT } from "@/lib/cartItems";
import { isOrderingClosed } from "@/lib/deliverySlots";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/lib/rateLimit";
import { generateOrderToken } from "@/lib/orderToken";
import { INVALID_PHONE_MESSAGE, isValidCustomerPhone } from "@/lib/whatsappLink";
import { sweepExpiredMpOrders } from "@/lib/expiredMpOrders";

class InsufficientStockError extends Error {
  constructor(public productId: number, public productName: string) {
    super(`Stock insuficiente para ${productName}`);
  }
}

// Endpoint público que crea pedidos: sin un freno, un script podría llenar la
// lista de pedidos falsos y ocupar stock. El tope es generoso porque muchas personas comparten
// IP en redes móviles, y cambiar el carrito en el checkout crea un pedido nuevo.
const ORDERS_RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const { allowed, resetAt } = checkRateLimit(`orders:${getClientIp(req)}`, ORDERS_RATE_LIMIT);
  if (!allowed) {
    return tooManyRequestsResponse(resetAt, "Demasiados pedidos desde tu conexión. Probá de nuevo en un rato.");
  }

  // BRT-256: liberar el stock de pedidos de MP vencidos antes de leerlo.
  await sweepExpiredMpOrders();

  try {
    const body = await req.json();
    const { customerName, customerPhone, customerAddress, deliverySlotId, items: rawItems, notes } = body;

    if (!customerName || !customerPhone || !deliverySlotId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    if (!isValidCustomerPhone(customerPhone)) {
      return NextResponse.json({ error: INVALID_PHONE_MESSAGE }, { status: 400 });
    }

    const items = normalizeCartItems(rawItems);
    if (!items) {
      return NextResponse.json({ error: "Cantidades inválidas" }, { status: 400 });
    }

    // normalizeCartItems ya consolidó las líneas repetidas: el tope aplica al
    // total de cada pan, no a cada línea por separado.
    if (items.some((i) => i.quantity > MAX_PER_PRODUCT)) {
      return NextResponse.json(
        { error: `Máximo ${MAX_PER_PRODUCT} unidades de cada pan por pedido` },
        { status: 400 }
      );
    }

    const slot = await prisma.deliverySlot.findUnique({ where: { id: deliverySlotId } });
    if (!slot || !slot.active) {
      return NextResponse.json({ error: "Fecha no disponible" }, { status: 400 });
    }

    // El tipo de entrega lo define la fecha (admin, Nueva fecha), no el
    // cliente: en una fecha de delivery la dirección es obligatoria; en una
    // de retiro (o las viejas "both") se ignora lo que venga.
    const isDelivery = slot.deliveryMode === "delivery";
    const address = isDelivery && typeof customerAddress === "string" ? customerAddress.trim() : "";
    if (isDelivery && !address) {
      return NextResponse.json({ error: "La dirección de entrega es requerida" }, { status: 400 });
    }

    const now = new Date();

    // BRT-114: el cierre de pedidos por horario se valida server-side, no
    // solo en el front. Sin reserva de stock por tiempo, quien ya estaba en
    // el flujo cuando cerró la fecha puede confirmar hasta el fin de la
    // tolerancia (ver lib/deliverySlots.ts); después, 400.
    if (isOrderingClosed(slot, now)) {
      return NextResponse.json(
        { error: "El horario límite para pedir en esta fecha ya pasó" },
        { status: 400 }
      );
    }

    // Verify stock and calculate total
    let total = 0;
    const enrichedItems: { productId: number; quantity: number; unitPrice: number; name: string }[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.active) {
        return NextResponse.json({ error: `Producto no disponible: ${item.productId}` }, { status: 400 });
      }

      const stock = await prisma.productStock.findUnique({
        where: { productId_deliverySlotId: { productId: item.productId, deliverySlotId } },
      });

      // BRT-113: sin fila de ProductStock para este producto+fecha se trata
      // como 0 disponible, no como "sin límite" — antes el pedido pasaba
      // sin ninguna validación de stock para ese ítem.
      if (!stock) {
        return NextResponse.json(
          { error: `Stock no disponible para ${product.name}` },
          { status: 400 }
        );
      }

      const available = stock.totalStock - stock.reservedStock;

      if (available < item.quantity) {
        return NextResponse.json({ error: `Stock insuficiente para ${product.name}` }, { status: 400 });
      }

      total += effectivePrice(product) * item.quantity;
      enrichedItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: effectivePrice(product), name: product.name });
    }

    // Re-chequeo del cutoff justo antes de crear el pedido: entre el chequeo
    // de arriba y acá pasaron varias consultas async (productos, stock) —
    // una ventana chica pero real en la que el cutoff podría haber pasado
    // mientras se procesaba el request.
    if (isOrderingClosed(slot, new Date())) {
      return NextResponse.json(
        { error: "El horario límite para pedir en esta fecha ya pasó" },
        { status: 400 }
      );
    }

    // Create order and reserve stock — all in one transaction
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            customerName,
            customerPhone,
            customerAddress: address,
            deliverySlotId,
            total,
            notes: notes ?? "",
            status: "pending",
            // BRT-251: solo este cliente lo recibe (ver lib/orderToken.ts).
            publicToken: generateOrderToken(),
            items: {
              create: enrichedItems.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
              })),
            },
          },
        });

        // Orden consistente (por productId) al tomar los locks de fila de
        // ProductStock: si dos pedidos concurrentes comparten productos
        // pero los mandan en orden distinto, sin esto podrían deadlockear
        // entre sí en vez de simplemente competir por el stock.
        // Desde BRT-113, todo item en enrichedItems tiene garantizada su
        // fila de ProductStock (si no existía, ya se rechazó antes).
        const stockUpdates = [...enrichedItems].sort((a, b) => a.productId - b.productId);

        for (const item of stockUpdates) {
          // Update atómico: solo incrementa reservedStock si todavía hay
          // capacidad en ese momento exacto (BRT-109). Si dos requests
          // concurrentes compiten por el mismo stock, como mucho una de
          // las dos consigue afectar la fila.
          const affected = await tx.$executeRaw`
            UPDATE "ProductStock"
            SET "reservedStock" = "reservedStock" + ${item.quantity}
            WHERE "productId" = ${item.productId}
              AND "deliverySlotId" = ${deliverySlotId}
              AND "totalStock" - "reservedStock" >= ${item.quantity}
          `;

          if (affected === 0) {
            throw new InsufficientStockError(item.productId, item.name);
          }
        }

        return newOrder;
      });
    } catch (e) {
      if (e instanceof InsufficientStockError) {
        return NextResponse.json({ error: e.message }, { status: 409 });
      }
      throw e;
    }

    return NextResponse.json({ orderId: order.id, total, token: order.publicToken });
  } catch (e) {
    console.error("Order creation error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
