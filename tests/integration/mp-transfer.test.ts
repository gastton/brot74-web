import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { NextRequest } from "next/server";

import { POST as switchToTransfer } from "@/app/api/orders/[id]/transfer/route";
import { POST as paymentStatus } from "@/app/api/orders/[id]/payment-status/route";
import { prisma } from "@/lib/db";
import { cancelExpiredMpOrders, EXPIRED_MP_GRACE_MINUTES } from "@/lib/expiredMpOrders";
import { createProduct, createDeliverySlot, createProductStock, createOrder, getStock } from "../helpers/factories";

// Pasar un pedido de Mercado Pago a transferencia al alias desde "Todavía no
// pagaste". La API de MP se simula en el borde HTTP (fetch); Prisma y la base
// son reales.

const TOKEN = "token-de-prueba-del-pedido-0123456789";
const MP_ORDER_ID = "ORDTST01TRANSFER";

function request(path: string, orderId: number | string, body: unknown) {
  return [
    new NextRequest(`http://localhost/api/orders/${orderId}/${path}`, { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: String(orderId) }) },
  ] as const;
}

function mpResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Pedido de 2 × $1000 con link de MP, stock reservado y el link vencido hace `expiredMinutesAgo` (negativo = vigente). */
async function mpOrder(expiredMinutesAgo = -20, overrides: Parameters<typeof createOrder>[2] = {}) {
  const product = await createProduct();
  const slot = await createDeliverySlot();
  await createProductStock(product.id, slot.id, { totalStock: 5, reservedStock: 2 });
  const order = await createOrder(slot.id, [{ productId: product.id, quantity: 2, unitPrice: 1000 }], {
    publicToken: TOKEN,
    paymentMethod: "mp",
    mpOrderId: MP_ORDER_ID,
    paymentExpiresAt: new Date(Date.now() - expiredMinutesAgo * 60 * 1000),
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

describe("POST /api/orders/[id]/transfer", () => {
  it("pasa el pedido de MP a transferencia sin vencimiento y devuelve el total", async () => {
    const { order } = await mpOrder();

    const res = await switchToTransfer(...request("transfer", order.id, { token: TOKEN }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "transfer", total: 2000 });
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({
      status: "pending",
      paymentMethod: "alias",
      paymentExpiresAt: null,
      mpOrderId: MP_ORDER_ID,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("un pedido pasado a transferencia no se cancela por vencido y conserva su stock", async () => {
    const { order, product, slot } = await mpOrder(-5);
    await switchToTransfer(...request("transfer", order.id, { token: TOKEN }));

    // Dos horas después de que venciera el link de MP, la limpieza no lo toca.
    expect(await cancelExpiredMpOrders(new Date(Date.now() + (EXPIRED_MP_GRACE_MINUTES + 120) * 60 * 1000))).toEqual([]);

    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe("pending");
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(2);
  });

  it("si igual se pagó por MP después de pasar a transferencia, se confirma como pago de MP", async () => {
    const { order } = await mpOrder();
    await switchToTransfer(...request("transfer", order.id, { token: TOKEN }));
    fetchSpy.mockResolvedValue(
      mpResponse({
        id: MP_ORDER_ID,
        status: "processed",
        status_detail: "accredited",
        external_reference: String(order.id),
        total_paid_amount: "2000.00",
        transactions: { payments: [{ id: "PAYTST-TARDE", status: "processed", payment_method: { type: "account_money" } }] },
      })
    );

    const res = await paymentStatus(...request("payment-status", order.id, { token: TOKEN }));

    expect(await res.json()).toEqual({ status: "approved" });
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({
      status: "paid",
      paymentMethod: "mp",
      mpPaymentId: "PAYTST-TARDE",
    });
  });

  it("después de pasar a transferencia, el estado del pago es transfer (MP sin pagar)", async () => {
    const { order } = await mpOrder();
    await switchToTransfer(...request("transfer", order.id, { token: TOKEN }));
    fetchSpy.mockResolvedValue(mpResponse({ id: MP_ORDER_ID, status: "created", external_reference: String(order.id) }));

    const res = await paymentStatus(...request("payment-status", order.id, { token: TOKEN }));

    expect(await res.json()).toEqual({ status: "transfer", total: 2000 });
  });

  it("devuelve 404 sin tocar el pedido con token incorrecto, sin token o pedido inexistente", async () => {
    const { order } = await mpOrder();

    for (const [id, body] of [
      [order.id, { token: "otro-token-de-la-misma-longitud-xxxx" }],
      [order.id, {}],
      [999999, { token: TOKEN }],
      ["abc", { token: TOKEN }],
    ] as const) {
      expect((await switchToTransfer(...request("transfer", id, body))).status).toBe(404);
    }
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.paymentMethod).toBe("mp");
  });

  it("devuelve 409 si el pedido ya no está pendiente (pagado o cancelado)", async () => {
    const paid = await mpOrder(-20, { status: "paid", mpPaymentId: "PAYTST-YA", publicToken: "token-pagado" });
    const cancelled = await mpOrder(-20, { status: "cancelled", publicToken: "token-cancelado", mpOrderId: "ORDTST-OTRA" });

    expect((await switchToTransfer(...request("transfer", paid.order.id, { token: "token-pagado" }))).status).toBe(409);
    expect((await switchToTransfer(...request("transfer", cancelled.order.id, { token: "token-cancelado" }))).status).toBe(409);
    expect(await prisma.order.findUnique({ where: { id: paid.order.id } })).toMatchObject({ status: "paid", paymentMethod: "mp" });
  });
});
