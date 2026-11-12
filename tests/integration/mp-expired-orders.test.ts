import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

import { GET as getProducts } from "@/app/api/products/route";
import { POST as createOrderEndpoint } from "@/app/api/orders/route";
import { GET as getAdminOrders } from "@/app/api/admin/orders/route";
import { cancelExpiredMpOrders, EXPIRED_MP_GRACE_MINUTES } from "@/lib/expiredMpOrders";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createProductStock, createOrder, getStock } from "../helpers/factories";
import { adminCookieHeader } from "../helpers/auth";

// BRT-256: los pedidos de MP vencidos sin pago se cancelan y devuelven el
// stock antes de que alguien lo lea. Prisma y la base son reales.

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

/**
 * Producto con 5 de stock en una fecha y un pedido de 3 que ya los reservó
 * (como hace /api/orders), pagando con MP y con el link vencido hace `expiredMinutesAgo`.
 */
async function reservedMpOrder(expiredMinutesAgo: number, overrides: Parameters<typeof createOrder>[2] = {}) {
  const product = await createProduct();
  const slot = await createDeliverySlot();
  await createProductStock(product.id, slot.id, { totalStock: 5, reservedStock: 3 });
  const order = await createOrder(slot.id, [{ productId: product.id, quantity: 3, unitPrice: 1000 }], {
    paymentMethod: "mp",
    mpOrderId: `ORDTST-${Math.random().toString(36).slice(2)}`,
    paymentExpiresAt: minutesAgo(expiredMinutesAgo),
    ...overrides,
  });
  return { product, slot, order };
}

let infoSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  infoSpy.mockRestore();
});

describe("Pedidos de MP vencidos sin pago (BRT-256)", () => {
  it("al leer los productos, cancela el pedido vencido y la fecha vuelve a tener el stock", async () => {
    const { product, slot, order } = await reservedMpOrder(EXPIRED_MP_GRACE_MINUTES + 1);

    const res = await getProducts(new NextRequest(`http://localhost/api/products?slotId=${slot.id}`));
    const [listed] = await res.json();

    expect(listed.stock).toBe(5);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe("cancelled");
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(0);
  });

  it("un pedido nuevo puede usar el stock que retenía un pedido vencido", async () => {
    const { product, slot } = await reservedMpOrder(EXPIRED_MP_GRACE_MINUTES + 1);

    const res = await createOrderEndpoint(
      new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Ana",
          customerPhone: "1122334455",
          deliverySlotId: slot.id,
          items: [{ productId: product.id, quantity: 5 }],
        }),
      })
    );

    expect(res.status).toBe(200);
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(5);
  });

  it("el admin ve el pedido vencido como cancelado", async () => {
    const { order } = await reservedMpOrder(EXPIRED_MP_GRACE_MINUTES + 30);

    const res = await getAdminOrders(
      new NextRequest("http://localhost/api/admin/orders", { headers: await adminCookieHeader() })
    );
    const orders: { id: number; status: string }[] = await res.json();

    expect(orders.find((o) => o.id === order.id)?.status).toBe("cancelled");
  });

  it("no cancela dentro del margen, sin vencer, pagados ni pedidos por alias", async () => {
    const withinGrace = await reservedMpOrder(EXPIRED_MP_GRACE_MINUTES - 2);
    const notExpired = await reservedMpOrder(-15);
    const paid = await reservedMpOrder(EXPIRED_MP_GRACE_MINUTES + 60, { status: "paid", mpPaymentId: "PAYTST-1" });
    const alias = await reservedMpOrder(EXPIRED_MP_GRACE_MINUTES + 60, {
      paymentMethod: "alias",
      mpOrderId: null,
    });

    expect(await cancelExpiredMpOrders()).toEqual([]);

    for (const { order, product, slot } of [withinGrace, notExpired, paid, alias]) {
      const row = await prisma.order.findUnique({ where: { id: order.id } });
      expect(row?.status).toBe(order.status);
      expect((await getStock(product.id, slot.id))?.reservedStock).toBe(3);
    }
  });

  it("dos limpiezas simultáneas devuelven el stock una sola vez", async () => {
    const { product, slot, order } = await reservedMpOrder(EXPIRED_MP_GRACE_MINUTES + 1);

    const [a, b] = await Promise.all([cancelExpiredMpOrders(), cancelExpiredMpOrders()]);

    expect([...a, ...b]).toEqual([order.id]);
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(0);
    expect(await cancelExpiredMpOrders()).toEqual([]);
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(0);
  });
});
