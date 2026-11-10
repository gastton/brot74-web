import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/orders/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createProductStock, createOrder } from "../helpers/factories";

async function postOrder(extra: Record<string, unknown> = {}) {
  const product = await createProduct({ price: 1500 });
  const slot = await createDeliverySlot();
  await createProductStock(product.id, slot.id, { totalStock: 5 });
  return POST(
    new NextRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Gaston",
        customerPhone: "1122334455",
        deliverySlotId: slot.id,
        items: [{ productId: product.id, quantity: 1 }],
        ...extra,
      }),
    })
  );
}

describe("campos de pago del pedido (BRT-250)", () => {
  it("un pedido nuevo queda como transferencia al alias, sin datos de Mercado Pago", async () => {
    const res = await postOrder();
    expect(res.status).toBe(200);

    const order = await prisma.order.findFirstOrThrow();
    expect(order.status).toBe("pending");
    expect(order.paymentMethod).toBe("alias");
    expect(order.mpPreferenceId).toBeNull();
    expect(order.mpPaymentId).toBeNull();
    expect(order.paidAt).toBeNull();
    expect(order.paymentExpiresAt).toBeNull();
  });

  it("el cliente no puede forzar desde el body que el pedido figure como pagado por MP", async () => {
    const res = await postOrder({
      paymentMethod: "mp",
      mpPaymentId: "123456",
      paidAt: new Date().toISOString(),
      status: "paid",
    });
    expect(res.status).toBe(200);

    const order = await prisma.order.findFirstOrThrow();
    expect(order.status).toBe("pending");
    expect(order.paymentMethod).toBe("alias");
    expect(order.mpPaymentId).toBeNull();
    expect(order.paidAt).toBeNull();
  });

  it("no permite asociar el mismo pago de MP a dos pedidos", async () => {
    const slot = await createDeliverySlot();
    await createOrder(slot.id, [], { paymentMethod: "mp", mpPaymentId: "pago-1" });

    await expect(createOrder(slot.id, [], { paymentMethod: "mp", mpPaymentId: "pago-1" })).rejects.toThrow();
    expect(await prisma.order.count({ where: { mpPaymentId: "pago-1" } })).toBe(1);
  });
});
