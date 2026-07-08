import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/orders/route";
import { PATCH } from "@/app/api/admin/orders/[id]/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createProductStock, createOrder } from "../helpers/factories";
import { adminCookieHeader } from "../helpers/auth";

function getRequest(query = "") {
  return new NextRequest(`http://localhost/api/admin/orders${query}`);
}

async function authedGetRequest(query = "") {
  return new NextRequest(`http://localhost/api/admin/orders${query}`, { headers: await adminCookieHeader() });
}

function patchRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/orders/1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers,
  });
}

describe("GET /api/admin/orders", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("devuelve los pedidos con datos del slot y los items", async () => {
    const product = await createProduct({ name: "Campo" });
    const slot = await createDeliverySlot({ dayLabel: "Lunes" });
    await createOrder(slot.id, [{ productId: product.id, quantity: 2, unitPrice: 1000 }]);

    const res = await GET(await authedGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].slotLabel).toBe("Lunes");
    expect(json[0].items[0]).toMatchObject({ name: "Campo", quantity: 2, unitPrice: 1000 });
  });

  it("filtra por slotId", async () => {
    const product = await createProduct();
    const slotA = await createDeliverySlot();
    const slotB = await createDeliverySlot();
    await createOrder(slotA.id, [{ productId: product.id, quantity: 1, unitPrice: 1000 }]);
    await createOrder(slotB.id, [{ productId: product.id, quantity: 1, unitPrice: 1000 }]);

    const res = await GET(await authedGetRequest(`?slotId=${slotA.id}`));
    const json = await res.json();

    expect(json).toHaveLength(1);
  });
});

describe("PATCH /api/admin/orders/[id]", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await PATCH(patchRequest({ status: "paid" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("devuelve 400 para un estado inválido", async () => {
    const headers = await adminCookieHeader();
    const res = await PATCH(patchRequest({ status: "no-existe" }, headers), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("actualiza el estado del pedido", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    const order = await createOrder(slot.id, [{ productId: product.id, quantity: 1, unitPrice: 1000 }]);

    const headers = await adminCookieHeader();
    const res = await PATCH(patchRequest({ status: "paid" }, headers), { params: Promise.resolve({ id: String(order.id) }) });

    expect(res.status).toBe(200);
    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe("paid");
  });

  it("libera el stock reservado al cancelar el pedido", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 10, reservedStock: 3 });
    const order = await createOrder(slot.id, [{ productId: product.id, quantity: 3, unitPrice: 1000 }]);

    const headers = await adminCookieHeader();
    const res = await PATCH(patchRequest({ status: "cancelled" }, headers), { params: Promise.resolve({ id: String(order.id) }) });

    expect(res.status).toBe(200);
    const stock = await prisma.productStock.findUnique({
      where: { productId_deliverySlotId: { productId: product.id, deliverySlotId: slot.id } },
    });
    expect(stock?.reservedStock).toBe(0);
  });
});
