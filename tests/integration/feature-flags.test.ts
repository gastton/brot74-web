import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppNotification: vi.fn(),
  buildOrderMessage: vi.fn(() => "mock message"),
}));

import { GET as adminGET, PATCH } from "@/app/api/admin/feature-flags/route";
import { GET as publicGET } from "@/app/api/feature-flags/route";
import { POST as createOrder } from "@/app/api/orders/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createProductStock } from "../helpers/factories";
import { adminCookieHeader } from "../helpers/auth";

function adminGetRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/feature-flags", { headers });
}

function patchRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/feature-flags", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers,
  });
}

describe("feature flags (BRT-268)", () => {
  it("arranca con mpCheckout apagado sin ninguna fila en la base", async () => {
    const res = await publicGET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ mpCheckout: false });
    expect(await prisma.featureFlag.count()).toBe(0);
  });

  it("el admin prende y apaga mpCheckout, y la lectura pública lo refleja", async () => {
    const headers = await adminCookieHeader();

    const on = await PATCH(patchRequest({ key: "mpCheckout", enabled: true }, headers));
    expect(on.status).toBe(200);
    expect(await on.json()).toEqual({ mpCheckout: true });
    expect(await (await publicGET()).json()).toEqual({ mpCheckout: true });

    const off = await PATCH(patchRequest({ key: "mpCheckout", enabled: false }, headers));
    expect(await off.json()).toEqual({ mpCheckout: false });
    expect(await (await adminGET(adminGetRequest(headers))).json()).toEqual({ mpCheckout: false });
  });

  it("rechaza leer o cambiar flags sin sesión de admin", async () => {
    expect((await adminGET(adminGetRequest())).status).toBe(401);
    expect((await PATCH(patchRequest({ key: "mpCheckout", enabled: true }))).status).toBe(401);
    expect(await prisma.featureFlag.count()).toBe(0);
  });

  it("rechaza un flag desconocido o un valor que no es boolean", async () => {
    const headers = await adminCookieHeader();

    expect((await PATCH(patchRequest({ key: "otraCosa", enabled: true }, headers))).status).toBe(400);
    expect((await PATCH(patchRequest({ key: "toString", enabled: true }, headers))).status).toBe(400);
    expect((await PATCH(patchRequest({ key: "mpCheckout", enabled: "si" }, headers))).status).toBe(400);
    expect(await prisma.featureFlag.count()).toBe(0);
  });

  it("con mpCheckout apagado, el pedido por transferencia al alias se crea igual que antes", async () => {
    const product = await createProduct({ price: 1500 });
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await createOrder(
      new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Gaston",
          customerPhone: "1122334455",
          deliverySlotId: slot.id,
          items: [{ productId: product.id, quantity: 2 }],
        }),
      })
    );

    expect(res.status).toBe(200);
    expect((await res.json()).total).toBe(3000);
    const order = await prisma.order.findFirstOrThrow();
    expect(order.status).toBe("pending");
  });
});
