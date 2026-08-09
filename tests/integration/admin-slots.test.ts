import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/slots/route";
import { PUT, DELETE } from "@/app/api/admin/slots/[id]/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createProductStock } from "../helpers/factories";
import { adminCookieHeader } from "../helpers/auth";

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/slots", { headers });
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/slots", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

function putRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/slots/1", {
    method: "PUT",
    body: JSON.stringify(body),
    headers,
  });
}

function deleteRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/slots/1", { method: "DELETE", headers });
}

describe("GET /api/admin/slots", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("devuelve slots activos e inactivos", async () => {
    await createDeliverySlot({ active: true });
    await createDeliverySlot({ active: false });

    const res = await GET(getRequest(await adminCookieHeader()));
    const json = await res.json();

    expect(json).toHaveLength(2);
  });
});

describe("POST /api/admin/slots", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await POST(postRequest({ date: "2026-08-10", dayLabel: "Lunes" }));
    expect(res.status).toBe(401);
  });

  it("crea el slot e inicializa stock (8 unidades) para cada producto activo", async () => {
    const active = await createProduct({ active: true });
    await createProduct({ active: false });

    const res = await POST(
      postRequest({ date: "2026-08-10", dayLabel: "Lunes" }, await adminCookieHeader())
    );
    const json = await res.json();

    expect(res.status).toBe(201);

    const stocks = await prisma.productStock.findMany({ where: { deliverySlotId: json.id } });
    expect(stocks).toHaveLength(1);
    expect(stocks[0].productId).toBe(active.id);
    expect(stocks[0].totalStock).toBe(8);
  });
});

describe("PUT /api/admin/slots/[id]", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await PUT(putRequest({ dayLabel: "Nuevo" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("actualiza los campos del slot", async () => {
    const slot = await createDeliverySlot({ dayLabel: "Viejo", active: true });

    const res = await PUT(
      putRequest({ dayLabel: "Actualizado", active: false }, await adminCookieHeader()),
      { params: Promise.resolve({ id: String(slot.id) }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.dayLabel).toBe("Actualizado");
    expect(json.active).toBe(false);
  });

  it("siempre deja el slot en modalidad pickup, sin importar qué se mande", async () => {
    const slot = await createDeliverySlot({ dayLabel: "Viejo", active: true });

    const res = await PUT(
      putRequest({ dayLabel: "Actualizado", deliveryMode: "delivery", active: true }, await adminCookieHeader()),
      { params: Promise.resolve({ id: String(slot.id) }) }
    );
    const json = await res.json();

    expect(json.deliveryMode).toBe("pickup");
  });
});

describe("DELETE /api/admin/slots/[id]", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await DELETE(deleteRequest(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("elimina el slot y su stock asociado (cascade)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id);

    const res = await DELETE(deleteRequest(await adminCookieHeader()), { params: Promise.resolve({ id: String(slot.id) }) });

    expect(res.status).toBe(200);
    const remaining = await prisma.deliverySlot.findUnique({ where: { id: slot.id } });
    expect(remaining).toBeNull();
    const stocks = await prisma.productStock.findMany({ where: { deliverySlotId: slot.id } });
    expect(stocks).toHaveLength(0);
  });
});
