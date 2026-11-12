import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { NextRequest } from "next/server";

import { POST as createMpCheckout } from "@/app/api/orders/[id]/mercadopago/route";
import { POST as createOrderEndpoint } from "@/app/api/orders/route";
import { prisma } from "@/lib/db";
import { setFeatureFlag, FEATURE_FLAGS } from "@/lib/featureFlags";
import { createProduct, createDeliverySlot, createProductStock, createOrder } from "../helpers/factories";

// BRT-251. La API de Mercado Pago se simula en el borde HTTP (fetch); Prisma
// y la base son reales.

const TOKEN = "token-de-prueba-del-pedido-0123456789";
const MP_ORDER = {
  id: "ORDTST01TEST",
  status: "created",
  checkout_url: "https://www.mercadopago.com.ar/checkout/v1/redirect?order_id=ORDTST01TEST",
};

function mpResponse(body: unknown, status = 201) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function checkoutRequest(orderId: number | string, body: unknown, headers: Record<string, string> = {}) {
  return [
    new NextRequest(`http://localhost/api/orders/${orderId}/mercadopago`, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    }),
    { params: Promise.resolve({ id: String(orderId) }) },
  ] as const;
}

/** Pedido pendiente de 2 × $1000 con token, listo para pagar con MP. */
async function pendingOrder(overrides: Parameters<typeof createOrder>[2] = {}) {
  const product = await createProduct({ name: "Campo" });
  const slot = await createDeliverySlot();
  return createOrder(slot.id, [{ productId: product.id, quantity: 2, unitPrice: 1000 }], {
    publicToken: TOKEN,
    ...overrides,
  });
}

let fetchSpy: MockInstance<typeof fetch>;

beforeEach(async () => {
  vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-test-token");
  await setFeatureFlag(FEATURE_FLAGS.mpCheckout, true);
  fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mpResponse(MP_ORDER));
});

afterEach(() => {
  fetchSpy.mockRestore();
  vi.unstubAllEnvs();
});

describe("POST /api/orders devuelve el token del pedido (BRT-251)", () => {
  it("genera un token distinto por pedido y lo guarda", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 10, reservedStock: 0 });
    const place = () =>
      createOrderEndpoint(
        new NextRequest("http://localhost/api/orders", {
          method: "POST",
          body: JSON.stringify({
            customerName: "Ana",
            customerPhone: "1122334455",
            deliverySlotId: slot.id,
            items: [{ productId: product.id, quantity: 1 }],
          }),
        })
      );

    const a = await (await place()).json();
    const b = await (await place()).json();

    expect(a.token).toEqual(expect.any(String));
    expect(a.token.length).toBeGreaterThanOrEqual(32);
    expect(a.token).not.toBe(b.token);
    expect((await prisma.order.findUnique({ where: { id: a.orderId } }))?.publicToken).toBe(a.token);
  });
});

describe("POST /api/orders/[id]/mercadopago (BRT-251)", () => {
  it("crea la orden de MP solo con dinero en cuenta y pasa el pedido a Mercado Pago", async () => {
    const order = await pendingOrder();
    const before = Date.now();

    const res = await createMpCheckout(...checkoutRequest(order.id, { token: TOKEN }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checkoutUrl: MP_ORDER.checkout_url });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.mercadopago.com/v1/orders");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer APP_USR-test-token");
    expect(headers["X-Idempotency-Key"]).toContain(`brot74-order-${order.id}-`);
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({
      type: "online",
      processing_mode: "manual",
      external_reference: String(order.id),
      total_amount: "2000.00",
      items: [{ title: "Campo", quantity: 2, unit_price: "1000.00" }],
      config: {
        online: { success_url: `http://localhost/confirmacion?order=${order.id}&pago=mp`, auto_return: "approved" },
        // Todo menos account_money: sin tarjetas, efectivo ni Mercado Crédito (digital_currency).
        payment_method: {
          not_allowed_types: ["credit_card", "debit_card", "prepaid_card", "ticket", "atm", "bank_transfer", "digital_currency"],
        },
      },
    });

    // El dinero en cuenta es lo único que queda habilitado.
    expect(sent.config.payment_method.not_allowed_types).not.toContain("account_money");

    const saved = await prisma.order.findUnique({ where: { id: order.id } });
    expect(saved).toMatchObject({ paymentMethod: "mp", mpOrderId: MP_ORDER.id, status: "pending" });
    const expiresInMin = (saved!.paymentExpiresAt!.getTime() - before) / 60_000;
    expect(expiresInMin).toBeGreaterThan(29);
    expect(expiresInMin).toBeLessThanOrEqual(30.1);
  });

  it("la vuelta desde MP usa el dominio por el que entró el cliente (proxy como ngrok o Vercel)", async () => {
    const order = await pendingOrder();

    await createMpCheckout(
      ...checkoutRequest(order.id, { token: TOKEN }, {
        "x-forwarded-host": "algo-123.ngrok-free.dev",
        "x-forwarded-proto": "https",
      })
    );

    const sent = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(sent.config.online.success_url).toBe(`https://algo-123.ngrok-free.dev/confirmacion?order=${order.id}&pago=mp`);
  });

  it("ignora un host que no es nuestro y vuelve al origen del servidor", async () => {
    const order = await pendingOrder();

    await createMpCheckout(
      ...checkoutRequest(order.id, { token: TOKEN }, { "x-forwarded-host": "sitio-malicioso.com", "x-forwarded-proto": "https" })
    );

    const sent = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(sent.config.online.success_url).toBe(`http://localhost/confirmacion?order=${order.id}&pago=mp`);
  });

  it("si el pedido ya tiene un link vigente devuelve el mismo, sin crear otra orden", async () => {
    const order = await pendingOrder({
      paymentMethod: "mp",
      mpOrderId: MP_ORDER.id,
      paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    fetchSpy.mockResolvedValue(mpResponse(MP_ORDER, 200));

    const res = await createMpCheckout(...checkoutRequest(order.id, { token: TOKEN }));

    expect(res.status).toBe(200);
    expect((await res.json()).checkoutUrl).toBe(MP_ORDER.checkout_url);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.mercadopago.com/v1/orders/${MP_ORDER.id}`);
    expect(init.method).toBeUndefined();
  });

  it("devuelve 404 sin llamar a MP con el toggle apagado", async () => {
    await setFeatureFlag(FEATURE_FLAGS.mpCheckout, false);
    const order = await pendingOrder();

    const res = await createMpCheckout(...checkoutRequest(order.id, { token: TOKEN }));

    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("devuelve 404 y no toca el pedido con token incorrecto, sin token o en un pedido sin token", async () => {
    const order = await pendingOrder();
    const legacy = await pendingOrder({ publicToken: null });

    for (const [id, body] of [
      [order.id, { token: "otro-token-de-la-misma-longitud-xxxx" }],
      [order.id, {}],
      [order.id, null],
      [legacy.id, { token: TOKEN }],
      [999999, { token: TOKEN }],
      ["abc", { token: TOKEN }],
    ] as const) {
      const res = await createMpCheckout(...checkoutRequest(id, body));
      expect(res.status).toBe(404);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ paymentMethod: "alias", mpOrderId: null });
  });

  it("devuelve 409 si el pedido ya no está pendiente o el link venció", async () => {
    const paid = await pendingOrder({ status: "paid", publicToken: "token-pagado" });
    const expired = await pendingOrder({
      publicToken: "token-vencido",
      paymentMethod: "mp",
      mpOrderId: "ORDTST-VENCIDA",
      paymentExpiresAt: new Date(Date.now() - 60 * 1000),
    });

    expect((await createMpCheckout(...checkoutRequest(paid.id, { token: "token-pagado" }))).status).toBe(409);
    expect((await createMpCheckout(...checkoutRequest(expired.id, { token: "token-vencido" }))).status).toBe(409);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("devuelve 502 y deja el pedido como estaba si MP falla", async () => {
    const order = await pendingOrder();
    fetchSpy.mockResolvedValue(mpResponse({ errors: [{ code: "internal_error" }] }, 500));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await createMpCheckout(...checkoutRequest(order.id, { token: TOKEN }));

    expect(res.status).toBe(502);
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({
      paymentMethod: "alias",
      mpOrderId: null,
      paymentExpiresAt: null,
    });
    consoleSpy.mockRestore();
  });
});
