import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/orders/route";
import { PATCH } from "@/app/api/admin/orders/[id]/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createProductStock, createOrder, getStock } from "../helpers/factories";
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

/** Dispara el mismo PATCH de status dos veces en simultáneo, para tests de concurrencia. */
function patchTwiceConcurrently(orderId: number, status: string, headers: Record<string, string>) {
  return Promise.all([
    PATCH(patchRequest({ status }, headers), { params: Promise.resolve({ id: String(orderId) }) }),
    PATCH(patchRequest({ status }, headers), { params: Promise.resolve({ id: String(orderId) }) }),
  ]);
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
    const stock = await getStock(product.id, slot.id);
    expect(stock?.reservedStock).toBe(0);
  });

  it("devuelve 404 si el pedido no existe", async () => {
    const headers = await adminCookieHeader();
    const res = await PATCH(patchRequest({ status: "paid" }, headers), { params: Promise.resolve({ id: "999999" }) });
    expect(res.status).toBe(404);
  });

  it("no libera stock una segunda vez si el pedido ya estaba cancelado (BRT-111)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 10, reservedStock: 3 });
    const order = await createOrder(slot.id, [{ productId: product.id, quantity: 3, unitPrice: 1000 }], {
      status: "cancelled",
    });
    // El pedido ya estaba cancelado (y su stock ya liberado) antes de este
    // test — simula que la reservedStock ya bajó a 0 en la cancelación
    // original.
    await prisma.productStock.update({
      where: { productId_deliverySlotId: { productId: product.id, deliverySlotId: slot.id } },
      data: { reservedStock: 0 },
    });

    const headers = await adminCookieHeader();
    const res = await PATCH(patchRequest({ status: "cancelled" }, headers), { params: Promise.resolve({ id: String(order.id) }) });

    expect(res.status).toBe(200);
    const stock = await getStock(product.id, slot.id);
    // Si se hubiera decrementado de nuevo, quedaría en -3.
    expect(stock?.reservedStock).toBe(0);
  });

  it("vuelve a reservar el stock al reactivar un pedido cancelado, si hay disponible (BRT-111)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 10, reservedStock: 0 });
    const order = await createOrder(slot.id, [{ productId: product.id, quantity: 3, unitPrice: 1000 }], {
      status: "cancelled",
    });

    const headers = await adminCookieHeader();
    const res = await PATCH(patchRequest({ status: "pending" }, headers), { params: Promise.resolve({ id: String(order.id) }) });

    expect(res.status).toBe(200);
    const stock = await getStock(product.id, slot.id);
    expect(stock?.reservedStock).toBe(3);
  });

  it("devuelve 409 y no reactiva el pedido si ya no hay stock disponible (BRT-111)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    // Ya no queda capacidad: todo el stock está comprometido por otro pedido.
    await createProductStock(product.id, slot.id, { totalStock: 3, reservedStock: 3 });
    const order = await createOrder(slot.id, [{ productId: product.id, quantity: 3, unitPrice: 1000 }], {
      status: "cancelled",
    });

    const headers = await adminCookieHeader();
    const res = await PATCH(patchRequest({ status: "pending" }, headers), { params: Promise.resolve({ id: String(order.id) }) });

    expect(res.status).toBe(409);

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe("cancelled");

    const stock = await getStock(product.id, slot.id);
    expect(stock?.reservedStock).toBe(3);
  });

  it("no libera stock dos veces con dos cancelaciones concurrentes del mismo pedido (BRT-111)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 10, reservedStock: 3 });
    const order = await createOrder(slot.id, [{ productId: product.id, quantity: 3, unitPrice: 1000 }]);

    const headers = await adminCookieHeader();
    const [resA, resB] = await patchTwiceConcurrently(order.id, "cancelled", headers);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const stock = await getStock(product.id, slot.id);
    // Si el lock de fila no serializara las dos transacciones, esto
    // quedaría en -3 (decrementado dos veces).
    expect(stock?.reservedStock).toBe(0);
  });

  it("no re-reserva stock dos veces con dos reactivaciones concurrentes del mismo pedido (BRT-111)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 10, reservedStock: 0 });
    const order = await createOrder(slot.id, [{ productId: product.id, quantity: 3, unitPrice: 1000 }], {
      status: "cancelled",
    });

    const headers = await adminCookieHeader();
    const [resA, resB] = await patchTwiceConcurrently(order.id, "pending", headers);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const stock = await getStock(product.id, slot.id);
    // Si no serializara, quedaría en 6 (reservado dos veces).
    expect(stock?.reservedStock).toBe(3);
  });
});
