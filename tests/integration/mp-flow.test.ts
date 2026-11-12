import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";

import { POST as createOrderEndpoint } from "@/app/api/orders/route";
import { POST as createMpCheckout } from "@/app/api/orders/[id]/mercadopago/route";
import { POST as paymentStatus } from "@/app/api/orders/[id]/payment-status/route";
import { POST as webhook } from "@/app/api/payments/webhook/route";
import { GET as getProducts } from "@/app/api/products/route";
import { prisma } from "@/lib/db";
import { setFeatureFlag, FEATURE_FLAGS } from "@/lib/featureFlags";
import { EXPIRED_MP_GRACE_MINUTES } from "@/lib/expiredMpOrders";
import { createProduct, createDeliverySlot, createProductStock, getStock } from "../helpers/factories";

// BRT-259: el flujo de pago con Mercado Pago de punta a punta, encadenando los
// endpoints como los usa la web: crear pedido → link de pago → vuelta desde
// MP → aviso firmado (webhook) → estado del pago. Mercado Pago se simula con
// una orden en memoria que cambia de estado como la real (created →
// processed/accredited); Prisma y la base son reales.

const SECRET = "firma-secreta-de-prueba";
const MP_ORDER_ID = "ORDTST01FLUJO";

/** Orden de MP simulada: arranca creada y sin pagar (así llega de MP: sin status_detail). */
let mpOrder: Record<string, unknown>;

function mpPays(amount: string) {
  mpOrder = {
    ...mpOrder,
    status: "processed",
    status_detail: "accredited",
    total_paid_amount: amount,
    transactions: { payments: [{ id: "PAYTST-FLUJO", status: "processed", payment_method: { type: "account_money" } }] },
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function fakeMercadoPago(input: string | URL | Request, init?: RequestInit) {
  const url = String(input);
  if (url === "https://api.mercadopago.com/v1/orders" && init?.method === "POST") {
    const body = JSON.parse(init.body as string);
    mpOrder = {
      id: MP_ORDER_ID,
      type: "online",
      status: "created",
      external_reference: body.external_reference,
      total_amount: body.total_amount,
      checkout_url: `https://www.mercadopago.com.ar/checkout/v1/redirect?order_id=${MP_ORDER_ID}`,
    };
    return Promise.resolve(json(mpOrder, 201));
  }
  if (url === `https://api.mercadopago.com/v1/orders/${MP_ORDER_ID}`) return Promise.resolve(json(mpOrder));
  return Promise.resolve(json({ message: "not found" }, 404));
}

function post(url: string, body: unknown) {
  return new NextRequest(url, { method: "POST", body: JSON.stringify(body) });
}

const params = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

function signedNotification() {
  const ts = String(Date.now());
  const requestId = "req-flujo-1";
  const v1 = createHmac("sha256", SECRET).update(`id:${MP_ORDER_ID};request-id:${requestId};ts:${ts};`).digest("hex");
  return new NextRequest(`http://localhost/api/payments/webhook?data.id=${MP_ORDER_ID}&type=order`, {
    method: "POST",
    headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
    body: JSON.stringify({ action: "order.processed", type: "order", data: { id: MP_ORDER_ID } }),
  });
}

/** Producto de $1000 con 5 de stock en una fecha abierta, y un pedido de 2 creado por la API pública. */
async function placeOrder() {
  const product = await createProduct({ name: "Campo", price: 1000 });
  const slot = await createDeliverySlot();
  await createProductStock(product.id, slot.id, { totalStock: 5, reservedStock: 0 });
  const res = await createOrderEndpoint(
    post("http://localhost/api/orders", {
      customerName: "Ana",
      customerPhone: "1122334455",
      deliverySlotId: slot.id,
      items: [{ productId: product.id, quantity: 2 }],
    })
  );
  const { orderId, total, token } = await res.json();
  return { product, slot, orderId: orderId as number, total: total as number, token: token as string };
}

async function statusOf(orderId: number, token: string) {
  return (await (await paymentStatus(post(`http://localhost/api/orders/${orderId}/payment-status`, { token }), params(orderId))).json()).status;
}

beforeEach(async () => {
  vi.stubEnv("MP_ACCESS_TOKEN", "APP_USR-test-token");
  vi.stubEnv("MP_WEBHOOK_SECRET", SECRET);
  await setFeatureFlag(FEATURE_FLAGS.mpCheckout, true);
  vi.spyOn(globalThis, "fetch").mockImplementation(fakeMercadoPago);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Flujo de pago con Mercado Pago de punta a punta (BRT-259)", () => {
  it("pedido → link → vuelve sin pagar → paga → aviso firmado → pagado y aprobado", async () => {
    const { product, slot, orderId, total, token } = await placeOrder();
    expect(total).toBe(2000);
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(2);

    // Link de pago: el pedido pasa a MP con vencimiento.
    const link = await createMpCheckout(post(`http://localhost/api/orders/${orderId}/mercadopago`, { token }), params(orderId));
    expect(link.status).toBe(200);
    expect((await link.json()).checkoutUrl).toContain(MP_ORDER_ID);
    expect(await prisma.order.findUnique({ where: { id: orderId } })).toMatchObject({ paymentMethod: "mp", mpOrderId: MP_ORDER_ID });

    // Vuelve de MP sin pagar ("Volver a la tienda").
    expect(await statusOf(orderId, token)).toBe("unpaid");

    // Reintenta: mismo link, sin crear otra orden en MP.
    const retry = await createMpCheckout(post(`http://localhost/api/orders/${orderId}/mercadopago`, { token }), params(orderId));
    expect((await retry.json()).checkoutUrl).toContain(MP_ORDER_ID);

    // Paga y llega el aviso firmado.
    mpPays("2000.00");
    const notice = await webhook(signedNotification());
    expect(await notice.json()).toMatchObject({ outcome: "confirmed" });

    // La vuelta ve el pago aprobado; el pedido queda pagado y el stock sigue reservado.
    expect(await statusOf(orderId, token)).toBe("approved");
    expect(await prisma.order.findUnique({ where: { id: orderId } })).toMatchObject({
      status: "paid",
      mpPaymentId: "PAYTST-FLUJO",
    });
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(2);

    // Un aviso repetido no cambia nada.
    expect(await (await webhook(signedNotification())).json()).toMatchObject({ outcome: "already_confirmed" });
  });

  it("si el cliente vuelve antes que el aviso, la consulta de estado confirma el pago", async () => {
    const { orderId, token } = await placeOrder();
    await createMpCheckout(post(`http://localhost/api/orders/${orderId}/mercadopago`, { token }), params(orderId));

    mpPays("2000.00");

    expect(await statusOf(orderId, token)).toBe("approved");
    expect(await (await webhook(signedNotification())).json()).toMatchObject({ outcome: "already_confirmed" });
  });

  it("link vencido sin pago: se cancela, vuelve el stock y un pago tardío no lo confirma", async () => {
    const { product, slot, orderId, token } = await placeOrder();
    await createMpCheckout(post(`http://localhost/api/orders/${orderId}/mercadopago`, { token }), params(orderId));

    // Pasa el tiempo: el link venció hace más que el margen.
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentExpiresAt: new Date(Date.now() - (EXPIRED_MP_GRACE_MINUTES + 1) * 60 * 1000) },
    });
    mpOrder = { ...mpOrder, status: "expired" };

    // Cualquiera que mire el stock libera el pedido vencido.
    await getProducts(new NextRequest(`http://localhost/api/products?slotId=${slot.id}`));
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(0);
    expect(await statusOf(orderId, token)).toBe("rejected");

    // Un link vencido no se vuelve a dar.
    const again = await createMpCheckout(post(`http://localhost/api/orders/${orderId}/mercadopago`, { token }), params(orderId));
    expect(again.status).toBe(409);

    // Si igual llega un pago, no se confirma: queda en los logs para devolverlo a mano.
    mpPays("2000.00");
    expect(await (await webhook(signedNotification())).json()).toMatchObject({ outcome: "rejected" });
    expect(await prisma.order.findUnique({ where: { id: orderId } })).toMatchObject({ status: "cancelled", mpPaymentId: null });
  });

  it("un aviso con el monto distinto no confirma el pedido", async () => {
    const { orderId, token } = await placeOrder();
    await createMpCheckout(post(`http://localhost/api/orders/${orderId}/mercadopago`, { token }), params(orderId));

    mpPays("1.00");

    expect(await (await webhook(signedNotification())).json()).toMatchObject({ outcome: "rejected" });
    expect(await statusOf(orderId, token)).toBe("pending");
    expect((await prisma.order.findUnique({ where: { id: orderId } }))?.status).toBe("pending");
  });
});
