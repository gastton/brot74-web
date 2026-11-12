import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { NextRequest } from "next/server";

import { POST as paymentStatus } from "@/app/api/orders/[id]/payment-status/route";
import { prisma } from "@/lib/db";
import { EXPIRED_MP_GRACE_MINUTES } from "@/lib/expiredMpOrders";
import { createProduct, createDeliverySlot, createProductStock, createOrder, getStock } from "../helpers/factories";

// BRT-257. La API de Mercado Pago se simula en el borde HTTP (fetch); Prisma
// y la base son reales.

const TOKEN = "token-de-prueba-del-pedido-0123456789";
const MP_ORDER_ID = "ORDTST01ESTADO";

function statusRequest(orderId: number | string, body: unknown) {
  return [
    new NextRequest(`http://localhost/api/orders/${orderId}/payment-status`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: String(orderId) }) },
  ] as const;
}

function mpResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function mpOrder(externalReference: number, overrides: Record<string, unknown> = {}) {
  return {
    id: MP_ORDER_ID,
    status: "processed",
    status_detail: "accredited",
    external_reference: String(externalReference),
    total_paid_amount: "2000.00",
    transactions: { payments: [{ id: "PAYTST-ESTADO", status: "processed", payment_method: { type: "account_money" } }] },
    ...overrides,
  };
}

/** Pedido de 2 × $1000 con token y stock reservado, pagando con MP. */
async function mpOrderRow(overrides: Parameters<typeof createOrder>[2] = {}) {
  const product = await createProduct();
  const slot = await createDeliverySlot();
  await createProductStock(product.id, slot.id, { totalStock: 5, reservedStock: 2 });
  const order = await createOrder(slot.id, [{ productId: product.id, quantity: 2, unitPrice: 1000 }], {
    publicToken: TOKEN,
    paymentMethod: "mp",
    mpOrderId: MP_ORDER_ID,
    paymentExpiresAt: new Date(Date.now() + 20 * 60 * 1000),
    ...overrides,
  });
  return { order, product, slot };
}

let fetchSpy: MockInstance<typeof fetch>;

beforeEach(() => {
  vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-test-token");
  fetchSpy = vi.spyOn(globalThis, "fetch");
});

afterEach(() => {
  fetchSpy.mockRestore();
  vi.unstubAllEnvs();
});

describe("POST /api/orders/[id]/payment-status (BRT-257)", () => {
  it("si MP ya acreditó el pago y el aviso no llegó, lo confirma y responde approved", async () => {
    const { order } = await mpOrderRow();
    fetchSpy.mockResolvedValue(mpResponse(mpOrder(order.id)));

    const res = await paymentStatus(...statusRequest(order.id, { token: TOKEN }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "approved" });
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({
      status: "paid",
      mpPaymentId: "PAYTST-ESTADO",
    });
  });

  it("un pedido ya pagado responde approved sin consultar a MP", async () => {
    const { order } = await mpOrderRow({ status: "preparing", mpPaymentId: "PAYTST-YA" });

    const res = await paymentStatus(...statusRequest(order.id, { token: TOKEN }));

    expect(await res.json()).toEqual({ status: "approved" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("responde pending mientras MP no acredita, y también si MP no responde", async () => {
    const { order } = await mpOrderRow();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    fetchSpy.mockResolvedValueOnce(mpResponse(mpOrder(order.id, { status: "created", status_detail: "created" })));
    expect(await (await paymentStatus(...statusRequest(order.id, { token: TOKEN }))).json()).toEqual({ status: "pending" });

    fetchSpy.mockResolvedValueOnce(mpResponse({ message: "internal_error" }, 500));
    expect(await (await paymentStatus(...statusRequest(order.id, { token: TOKEN }))).json()).toEqual({ status: "pending" });

    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe("pending");
    warnSpy.mockRestore();
  });

  it("responde rejected si el link venció sin pago, y devuelve el stock", async () => {
    const { order, product, slot } = await mpOrderRow({
      paymentExpiresAt: new Date(Date.now() - (EXPIRED_MP_GRACE_MINUTES + 1) * 60 * 1000),
    });
    fetchSpy.mockResolvedValue(mpResponse(mpOrder(order.id, { status: "canceled", status_detail: "expired" })));
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const res = await paymentStatus(...statusRequest(order.id, { token: TOKEN }));

    expect(await res.json()).toEqual({ status: "rejected" });
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(0);
    infoSpy.mockRestore();
  });

  it("devuelve 404 sin dar el estado con token incorrecto, sin token o pedido inexistente", async () => {
    const { order } = await mpOrderRow({ status: "paid", mpPaymentId: "PAYTST-SECRETO" });

    for (const [id, body] of [
      [order.id, { token: "otro-token-de-la-misma-longitud-xxxx" }],
      [order.id, {}],
      [order.id, null],
      [999999, { token: TOKEN }],
      ["abc", { token: TOKEN }],
    ] as const) {
      const res = await paymentStatus(...statusRequest(id, body));
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Pedido no encontrado" });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("un pedido por alias responde pending sin consultar a MP", async () => {
    const { order } = await mpOrderRow({ paymentMethod: "alias", mpOrderId: null });

    const res = await paymentStatus(...statusRequest(order.id, { token: TOKEN }));

    expect(await res.json()).toEqual({ status: "pending" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
