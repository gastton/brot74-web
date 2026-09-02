import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/admin/stock/route";
import { createProduct, createDeliverySlot, createProductStock, getStock } from "../helpers/factories";
import { adminCookieHeader } from "../helpers/auth";

function getRequest(query = "", headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/admin/stock${query}`, { headers });
}

function putRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/stock", {
    method: "PUT",
    body: JSON.stringify(body),
    headers,
  });
}

describe("GET /api/admin/stock", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("devuelve el stock con el disponible calculado", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 10, reservedStock: 3 });

    const res = await GET(getRequest("", await adminCookieHeader()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json[0].available).toBe(7);
  });

  it("filtra por slotId", async () => {
    const product = await createProduct();
    const slotA = await createDeliverySlot();
    const slotB = await createDeliverySlot();
    await createProductStock(product.id, slotA.id);
    await createProductStock(product.id, slotB.id);

    const res = await GET(getRequest(`?slotId=${slotA.id}`, await adminCookieHeader()));
    const json = await res.json();

    expect(json).toHaveLength(1);
    expect(json[0].deliverySlotId).toBe(slotA.id);
  });
});

describe("PUT /api/admin/stock", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await PUT(putRequest({ productId: 1, deliverySlotId: 1, totalStock: 5 }));
    expect(res.status).toBe(401);
  });

  it("crea el registro de stock si no existe", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();

    const res = await PUT(
      putRequest({ productId: product.id, deliverySlotId: slot.id, totalStock: 12 }, await adminCookieHeader())
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.totalStock).toBe(12);
    expect(json.reservedStock).toBe(0);
  });

  it("actualiza el totalStock si ya existe, sin tocar reservedStock", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5, reservedStock: 2 });

    await PUT(putRequest({ productId: product.id, deliverySlotId: slot.id, totalStock: 20 }, await adminCookieHeader()));

    const stock = await getStock(product.id, slot.id);
    expect(stock?.totalStock).toBe(20);
    expect(stock?.reservedStock).toBe(2);
  });
});
