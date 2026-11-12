import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";

import { POST as webhook } from "@/app/api/payments/webhook/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createOrder } from "../helpers/factories";

// BRT-252/253/254/255. La API de Mercado Pago se simula en el borde HTTP
// (fetch); Prisma y la base son reales. Las firmas se calculan acá con el
// mismo algoritmo que usa MP, con un secreto de prueba.

const SECRET = "firma-secreta-de-prueba";
const MP_ORDER_ID = "ORDTST01WEBHOOK";
const REQUEST_ID = "5f2c1a7e-0000-4000-8000-000000000001";

function sign(dataId: string, ts = "1742505638683", requestId = REQUEST_ID, secret = SECRET) {
  const v1 = createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

function notification(
  dataId: string,
  { signature = sign(dataId), type = "order" }: { signature?: string | null; type?: string } = {}
) {
  const headers: Record<string, string> = { "x-request-id": REQUEST_ID, "content-type": "application/json" };
  if (signature) headers["x-signature"] = signature;
  return new NextRequest(`http://localhost/api/payments/webhook?data.id=${dataId}&type=${type}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "order.processed", type, data: { id: dataId } }),
  });
}

/** Respuesta de GET /v1/orders/{id}: por defecto, pagada con dinero en cuenta. */
function mpOrder(overrides: Record<string, unknown> = {}, externalReference?: string) {
  return {
    id: MP_ORDER_ID,
    type: "online",
    status: "processed",
    status_detail: "accredited",
    external_reference: externalReference,
    total_amount: "2000.00",
    total_paid_amount: "2000.00",
    transactions: {
      payments: [
        { id: "PAYTST01", amount: "2000.00", status: "processed", payment_method: { id: "account_money", type: "account_money" } },
      ],
    },
    ...overrides,
  };
}

function mpResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Pedido de 2 × $1000 con link de MP generado, esperando el pago. */
async function mpPendingOrder(overrides: Parameters<typeof createOrder>[2] = {}) {
  const product = await createProduct();
  const slot = await createDeliverySlot();
  return createOrder(slot.id, [{ productId: product.id, quantity: 2, unitPrice: 1000 }], {
    paymentMethod: "mp",
    mpOrderId: MP_ORDER_ID,
    paymentExpiresAt: new Date(Date.now() + 20 * 60 * 1000),
    ...overrides,
  });
}

let fetchSpy: MockInstance<typeof fetch>;
let warnSpy: MockInstance<typeof console.warn>;

beforeEach(() => {
  vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-test-token");
  vi.stubEnv("MP_WEBHOOK_SECRET", SECRET);
  fetchSpy = vi.spyOn(globalThis, "fetch");
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  fetchSpy.mockRestore();
  warnSpy.mockRestore();
  vi.unstubAllEnvs();
});

async function orderRow(id: number) {
  return prisma.order.findUnique({ where: { id } });
}

describe("POST /api/payments/webhook: pago acreditado", () => {
  it("consulta la orden a MP y pasa el pedido a pagado con paidAt y mpPaymentId", async () => {
    const order = await mpPendingOrder();
    fetchSpy.mockResolvedValue(mpResponse(mpOrder({}, String(order.id))));

    const res = await webhook(notification(MP_ORDER_ID));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ outcome: "confirmed" });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.mercadopago.com/v1/orders/${MP_ORDER_ID}`);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer APP_USR-test-token");

    const saved = await orderRow(order.id);
    expect(saved).toMatchObject({ status: "paid", mpPaymentId: "PAYTST01" });
    expect(saved!.paidAt).toBeInstanceOf(Date);
  });

  it("acepta la firma calculada con el data.id en minúsculas", async () => {
    const order = await mpPendingOrder();
    fetchSpy.mockResolvedValue(mpResponse(mpOrder({}, String(order.id))));

    const res = await webhook(notification(MP_ORDER_ID, { signature: sign(MP_ORDER_ID.toLowerCase()) }));

    expect(res.status).toBe(200);
    expect((await orderRow(order.id))?.status).toBe("paid");
  });

  it("un aviso repetido no confirma dos veces ni pisa la fecha de pago", async () => {
    const order = await mpPendingOrder();
    fetchSpy.mockImplementation(async () => mpResponse(mpOrder({}, String(order.id))));

    await webhook(notification(MP_ORDER_ID));
    const first = await orderRow(order.id);
    const res = await webhook(notification(MP_ORDER_ID));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ outcome: "already_confirmed" });
    expect((await orderRow(order.id))?.paidAt).toEqual(first!.paidAt);
  });

  it("dos avisos simultáneos de la misma orden confirman una sola vez", async () => {
    const order = await mpPendingOrder();
    fetchSpy.mockImplementation(async () => mpResponse(mpOrder({}, String(order.id))));

    const results = await Promise.all([webhook(notification(MP_ORDER_ID)), webhook(notification(MP_ORDER_ID))]);
    const outcomes = await Promise.all(results.map(async (r) => (await r.json()).outcome));

    expect(outcomes.sort()).toEqual(["already_confirmed", "confirmed"]);
    expect(await orderRow(order.id)).toMatchObject({ status: "paid", mpPaymentId: "PAYTST01" });
  });
});

describe("POST /api/payments/webhook: avisos que no confirman", () => {
  it("responde 401 sin tocar nada con firma inválida, de otro secreto o sin firma", async () => {
    const order = await mpPendingOrder();

    for (const signature of [
      null,
      "ts=1742505638683,v1=deadbeef",
      sign(MP_ORDER_ID, "1742505638683", REQUEST_ID, "otro-secreto"),
      sign("ORDTST-OTRA-ORDEN"),
      "basura",
    ]) {
      const res = await webhook(notification(MP_ORDER_ID, { signature }));
      expect(res.status).toBe(401);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await orderRow(order.id))?.status).toBe("pending");
  });

  it("ignora avisos de otro tipo sin consultar a MP", async () => {
    const res = await webhook(notification("123456", { type: "payment" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ignored: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no confirma si MP dice que la orden no está acreditada", async () => {
    const order = await mpPendingOrder();
    fetchSpy.mockResolvedValue(mpResponse(mpOrder({ status: "canceled", status_detail: "expired" }, String(order.id))));

    const res = await webhook(notification(MP_ORDER_ID));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ outcome: "not_paid" });
    expect((await orderRow(order.id))?.status).toBe("pending");
  });

  it("no confirma y deja registro si el monto pagado no coincide con el total", async () => {
    const order = await mpPendingOrder();
    fetchSpy.mockResolvedValue(mpResponse(mpOrder({ total_paid_amount: "1.00" }, String(order.id))));

    const res = await webhook(notification(MP_ORDER_ID));

    expect(await res.json()).toMatchObject({ outcome: "rejected" });
    expect(await orderRow(order.id)).toMatchObject({ status: "pending", mpPaymentId: null, paidAt: null });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("monto"), expect.objectContaining({ orderId: order.id }));
  });

  it("no confirma si la referencia no es un pedido con esa orden de MP", async () => {
    const other = await mpPendingOrder({ mpOrderId: "ORDTST-DE-OTRO-PEDIDO" });
    const alias = await mpPendingOrder({ paymentMethod: "alias", mpOrderId: null });

    for (const reference of [String(other.id), String(alias.id), "999999", "no-es-un-numero", undefined]) {
      fetchSpy.mockResolvedValueOnce(mpResponse(mpOrder({}, reference)));
      const res = await webhook(notification(MP_ORDER_ID));
      expect(await res.json()).toMatchObject({ outcome: "rejected" });
    }

    expect((await orderRow(other.id))?.status).toBe("pending");
    expect((await orderRow(alias.id))?.status).toBe("pending");
  });

  it("no confirma un pedido que ya no está pendiente (cancelado por vencido y pagado igual)", async () => {
    const order = await mpPendingOrder({ status: "cancelled" });
    fetchSpy.mockResolvedValue(mpResponse(mpOrder({}, String(order.id))));

    const res = await webhook(notification(MP_ORDER_ID));

    expect(await res.json()).toMatchObject({ outcome: "rejected" });
    expect(await orderRow(order.id)).toMatchObject({ status: "cancelled", mpPaymentId: null });
  });

  it("devuelve 500 para que MP reintente si no puede consultar la orden o viene sin estado, y 200 si la orden no existe", async () => {
    const order = await mpPendingOrder();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    fetchSpy.mockResolvedValueOnce(mpResponse({ message: "internal_error" }, 500));
    expect((await webhook(notification(MP_ORDER_ID))).status).toBe(500);

    fetchSpy.mockResolvedValueOnce(mpResponse({ id: MP_ORDER_ID, external_reference: String(order.id) }));
    expect((await webhook(notification(MP_ORDER_ID))).status).toBe(500);

    fetchSpy.mockResolvedValueOnce(mpResponse({ message: "order not found" }, 404));
    expect((await webhook(notification(MP_ORDER_ID))).status).toBe(200);

    expect((await orderRow(order.id))?.status).toBe("pending");
    errorSpy.mockRestore();
  });
});
