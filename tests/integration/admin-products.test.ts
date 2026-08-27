import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/products/route";
import { PUT, DELETE } from "@/app/api/admin/products/[id]/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createProductStock } from "../helpers/factories";
import { adminCookieHeader } from "../helpers/auth";

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/products", { headers });
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/products", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

function putRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/products/1", {
    method: "PUT",
    body: JSON.stringify(body),
    headers,
  });
}

function deleteRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/products/1", { method: "DELETE", headers });
}

function nextMondayAt(hoursFromNow: number) {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

describe("GET /api/admin/products", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("devuelve productos activos e inactivos, ordenados por sortOrder", async () => {
    await createProduct({ name: "B", sortOrder: 1, active: false });
    await createProduct({ name: "A", sortOrder: 0, active: true });

    const res = await GET(getRequest(await adminCookieHeader()));
    const json = await res.json();

    expect(json.map((p: { name: string }) => p.name)).toEqual(["A", "B"]);
  });
});

describe("POST /api/admin/products", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await POST(postRequest({ name: "Nuevo", price: 1000 }));
    expect(res.status).toBe(401);
  });

  it("crea el producto con los defaults esperados", async () => {
    const res = await POST(postRequest({ name: "Nuevo", price: "1500" }, await adminCookieHeader()));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.name).toBe("Nuevo");
    expect(json.price).toBe(1500);
    expect(json.active).toBe(true);
    expect(json.focalX).toBe(50);
  });

  it("persiste availableDays (BRT-119)", async () => {
    const res = await POST(
      postRequest({ name: "Con días", price: "1500", availableDays: "lunes,sabado" }, await adminCookieHeader())
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.availableDays).toBe("lunes,sabado");
  });

  it("al crear con un día disponible, inicializa stock (5) en slots futuros de ese día (BRT-119)", async () => {
    const mondaySlot = await createDeliverySlot({ date: nextMondayAt(24) });

    const res = await POST(
      postRequest({ name: "Con stock", price: "1500", availableDays: "lunes" }, await adminCookieHeader())
    );
    const json = await res.json();

    const stock = await prisma.productStock.findUnique({
      where: { productId_deliverySlotId: { productId: json.id, deliverySlotId: mondaySlot.id } },
    });
    expect(stock?.totalStock).toBe(5);
  });

  it("se recupera sola si la secuencia de id quedó desincronizada, en vez de devolver 500 (BRT-119)", async () => {
    const existing = await createProduct({ name: "Ya existe" });
    // Simula el drift real: la secuencia autoincremental quedó apuntando a un
    // id que ya existe (prisma db push recreando la tabla, restore, etc.).
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Product"', 'id'), ${existing.id}, false)`
    );

    const res = await POST(postRequest({ name: "Tras el drift", price: "1500" }, await adminCookieHeader()));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.name).toBe("Tras el drift");
    expect(json.id).not.toBe(existing.id);
  });
});

describe("PUT /api/admin/products/[id]", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await PUT(putRequest({ name: "X", price: 1000 }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("actualiza los campos básicos del producto", async () => {
    const product = await createProduct({ name: "Viejo", price: 1000, availableDays: "" });

    const res = await PUT(
      putRequest({ name: "Actualizado", price: 2000, availableDays: "" }, await adminCookieHeader()),
      { params: Promise.resolve({ id: String(product.id) }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.name).toBe("Actualizado");
    expect(json.price).toBe(2000);
  });

  it("al agregar un día disponible, inicializa stock (5) en slots futuros de ese día", async () => {
    const product = await createProduct({ availableDays: "" });
    const mondaySlot = await createDeliverySlot({ date: nextMondayAt(24) });

    await PUT(putRequest({ name: product.name, price: product.price, availableDays: "lunes" }, await adminCookieHeader()), {
      params: Promise.resolve({ id: String(product.id) }),
    });

    const stock = await prisma.productStock.findUnique({
      where: { productId_deliverySlotId: { productId: product.id, deliverySlotId: mondaySlot.id } },
    });
    expect(stock?.totalStock).toBe(5);
  });

  it("al quitar un día disponible, pone en 0 el stock de slots futuros de ese día", async () => {
    const product = await createProduct({ availableDays: "lunes" });
    const mondaySlot = await createDeliverySlot({ date: nextMondayAt(24) });
    await createProductStock(product.id, mondaySlot.id, { totalStock: 8, reservedStock: 0 });

    await PUT(putRequest({ name: product.name, price: product.price, availableDays: "" }, await adminCookieHeader()), {
      params: Promise.resolve({ id: String(product.id) }),
    });

    const stock = await prisma.productStock.findUnique({
      where: { productId_deliverySlotId: { productId: product.id, deliverySlotId: mondaySlot.id } },
    });
    expect(stock?.totalStock).toBe(0);
  });

  it("no toca el stock de slots que ya pasaron", async () => {
    const product = await createProduct({ availableDays: "" });
    const pastMonday = await createDeliverySlot({ date: nextMondayAt(-7 * 24) });

    await PUT(putRequest({ name: product.name, price: product.price, availableDays: "lunes" }, await adminCookieHeader()), {
      params: Promise.resolve({ id: String(product.id) }),
    });

    const stock = await prisma.productStock.findUnique({
      where: { productId_deliverySlotId: { productId: product.id, deliverySlotId: pastMonday.id } },
    });
    expect(stock).toBeNull();
  });

  it("no modifica el stock si la disponibilidad del día no cambió", async () => {
    const product = await createProduct({ availableDays: "lunes" });
    const mondaySlot = await createDeliverySlot({ date: nextMondayAt(24) });
    await createProductStock(product.id, mondaySlot.id, { totalStock: 8, reservedStock: 1 });

    await PUT(putRequest({ name: product.name, price: product.price, availableDays: "lunes" }, await adminCookieHeader()), {
      params: Promise.resolve({ id: String(product.id) }),
    });

    const stock = await prisma.productStock.findUnique({
      where: { productId_deliverySlotId: { productId: product.id, deliverySlotId: mondaySlot.id } },
    });
    expect(stock?.totalStock).toBe(8);
    expect(stock?.reservedStock).toBe(1);
  });
});

describe("DELETE /api/admin/products/[id]", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await DELETE(deleteRequest(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("elimina el producto", async () => {
    const product = await createProduct();

    const res = await DELETE(deleteRequest(await adminCookieHeader()), { params: Promise.resolve({ id: String(product.id) }) });

    expect(res.status).toBe(200);
    const remaining = await prisma.product.findUnique({ where: { id: product.id } });
    expect(remaining).toBeNull();
  });
});
