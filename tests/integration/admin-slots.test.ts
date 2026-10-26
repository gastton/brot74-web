import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/slots/route";
import { PUT, DELETE } from "@/app/api/admin/slots/[id]/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createProductStock, createOrder } from "../helpers/factories";
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

  it("crea el slot e inicializa stock (20 unidades) para cada producto activo", async () => {
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
    expect(stocks[0].totalStock).toBe(20);
    expect(stocks[0].reservedStock).toBe(0);
  });

  it("crea la fecha como retiro si no se manda el tipo de entrega", async () => {
    const res = await POST(postRequest({ date: "2026-08-10", dayLabel: "Lunes" }, await adminCookieHeader()));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.deliveryMode).toBe("pickup");
  });

  it("crea una fecha de delivery con su horario y zona", async () => {
    const res = await POST(
      postRequest(
        { date: "2026-08-10", dayLabel: "Lunes", deliveryMode: "delivery", pickupTime: "18:00 - 21:00", location: "El Talar" },
        await adminCookieHeader()
      )
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    const slot = await prisma.deliverySlot.findUnique({ where: { id: json.id } });
    expect(slot).toMatchObject({ deliveryMode: "delivery", pickupTime: "18:00 - 21:00", location: "El Talar" });
  });

  it("devuelve 400 y no crea la fecha con un tipo de entrega inválido", async () => {
    for (const deliveryMode of ["both", "envio", 1]) {
      const res = await POST(
        postRequest({ date: "2026-08-10", dayLabel: "Lunes", deliveryMode }, await adminCookieHeader())
      );
      expect(res.status).toBe(400);
    }
    expect(await prisma.deliverySlot.count()).toBe(0);
  });

  it("inicializa 20 unidades para todos los panes activos y ninguno para los inactivos", async () => {
    await createProduct({ active: true });
    await createProduct({ active: true });
    await createProduct({ active: false });

    const res = await POST(postRequest({ date: "2026-08-12", dayLabel: "Miércoles" }, await adminCookieHeader()));
    const json = await res.json();

    const stocks = await prisma.productStock.findMany({ where: { deliverySlotId: json.id } });
    expect(stocks).toHaveLength(2);
    expect(stocks.every((s) => s.totalStock === 20)).toBe(true);
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

  it("no cambia el tipo de entrega: se elige solo al crear la fecha", async () => {
    const slot = await createDeliverySlot({ dayLabel: "Viejo", deliveryMode: "delivery", active: true });

    const res = await PUT(
      putRequest({ dayLabel: "Actualizado", deliveryMode: "pickup", active: true }, await adminCookieHeader()),
      { params: Promise.resolve({ id: String(slot.id) }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.dayLabel).toBe("Actualizado");
    expect(json.deliveryMode).toBe("delivery");
  });

  it("habilitar/deshabilitar (body solo con active) conserva Pedidos hasta, horario, lugar e imagen", async () => {
    const cutoff = new Date("2026-08-09T15:00:00.000Z");
    const slot = await createDeliverySlot({
      active: true,
      orderCutoff: cutoff,
      pickupTime: "10:00 - 13:00",
      location: "Las Zinnias 154",
      imageUrl: "https://example.com/foto.jpg",
      imageFocalX: 30,
      imageFocalY: 70,
      imageScale: 1.4,
    });
    const headers = await adminCookieHeader();

    // deshabilitar y volver a habilitar, como hace el admin
    await PUT(putRequest({ active: false }, headers), { params: Promise.resolve({ id: String(slot.id) }) });
    const res = await PUT(putRequest({ active: true }, headers), { params: Promise.resolve({ id: String(slot.id) }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.active).toBe(true);
    expect(new Date(json.orderCutoff).toISOString()).toBe(cutoff.toISOString());
    expect(json.pickupTime).toBe("10:00 - 13:00");
    expect(json.location).toBe("Las Zinnias 154");
    expect(json.imageUrl).toBe("https://example.com/foto.jpg");
    expect(json.imageFocalX).toBe(30);
    expect(json.imageFocalY).toBe(70);
    expect(json.imageScale).toBe(1.4);
  });

  it("cambiar solo orderCutoff no pisa el resto de los campos", async () => {
    const slot = await createDeliverySlot({ pickupTime: "10:00 - 13:00", imageScale: 1.4 });

    const res = await PUT(
      putRequest({ orderCutoff: "2026-08-08T15:00:00.000Z" }, await adminCookieHeader()),
      { params: Promise.resolve({ id: String(slot.id) }) }
    );
    const json = await res.json();

    expect(new Date(json.orderCutoff).toISOString()).toBe("2026-08-08T15:00:00.000Z");
    expect(json.pickupTime).toBe("10:00 - 13:00");
    expect(json.imageScale).toBe(1.4);
  });

  it("un orderCutoff null explícito limpia Pedidos hasta", async () => {
    const slot = await createDeliverySlot({ orderCutoff: new Date("2026-08-09T15:00:00.000Z") });

    const res = await PUT(
      putRequest({ orderCutoff: null }, await adminCookieHeader()),
      { params: Promise.resolve({ id: String(slot.id) }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.orderCutoff).toBeNull();
  });

  it("devuelve 404 si la fecha no existe", async () => {
    const res = await PUT(putRequest({ active: false }, await adminCookieHeader()), { params: Promise.resolve({ id: "999999" }) });
    expect(res.status).toBe(404);
  });

  it("devuelve 400 si el id no es válido", async () => {
    const res = await PUT(putRequest({ active: false }, await adminCookieHeader()), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
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

  it("devuelve 409 (no 500) y no borra la fecha si tiene pedidos", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id);
    await createOrder(slot.id, [{ productId: product.id, quantity: 1, unitPrice: 1000 }]);
    await createOrder(slot.id, [{ productId: product.id, quantity: 2, unitPrice: 1000 }]);

    const res = await DELETE(deleteRequest(await adminCookieHeader()), { params: Promise.resolve({ id: String(slot.id) }) });
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toMatch(/2 pedidos/);
    expect(await prisma.deliverySlot.findUnique({ where: { id: slot.id } })).not.toBeNull();
    expect(await prisma.order.count({ where: { deliverySlotId: slot.id } })).toBe(2);
  });

  it("devuelve 404 si la fecha no existe", async () => {
    const res = await DELETE(deleteRequest(await adminCookieHeader()), { params: Promise.resolve({ id: "999999" }) });
    expect(res.status).toBe(404);
  });
});

describe("Pedidos hasta (orderCutoff) con un día de calendario", () => {
  it("al crear, \"2026-10-28\" cierra el 28/10 a las 13:00 de Argentina", async () => {
    const res = await POST(
      postRequest({ date: "2026-10-29", dayLabel: "Jueves 29 de octubre", orderCutoff: "2026-10-28" }, await adminCookieHeader())
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(new Date(json.orderCutoff).toISOString()).toBe("2026-10-28T16:00:00.000Z");
  });

  it("al editar, \"2026-10-28\" cierra el 28/10 a las 13:00 de Argentina", async () => {
    const slot = await createDeliverySlot();

    const res = await PUT(
      putRequest({ orderCutoff: "2026-10-28" }, await adminCookieHeader()),
      { params: Promise.resolve({ id: String(slot.id) }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(new Date(json.orderCutoff).toISOString()).toBe("2026-10-28T16:00:00.000Z");
  });

  it("al crear, \"2026-10-28T18:30\" cierra el 28/10 a las 18:30 de Argentina", async () => {
    const res = await POST(
      postRequest({ date: "2026-10-29", dayLabel: "Jueves 29 de octubre", orderCutoff: "2026-10-28T18:30" }, await adminCookieHeader())
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(new Date(json.orderCutoff).toISOString()).toBe("2026-10-28T21:30:00.000Z");
  });

  it("al editar, \"2026-10-28T09:15\" cierra el 28/10 a las 9:15 de Argentina", async () => {
    const slot = await createDeliverySlot();

    const res = await PUT(
      putRequest({ orderCutoff: "2026-10-28T09:15" }, await adminCookieHeader()),
      { params: Promise.resolve({ id: String(slot.id) }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(new Date(json.orderCutoff).toISOString()).toBe("2026-10-28T12:15:00.000Z");
  });

  it("devuelve 400 con una hora inválida, y no toca la fecha guardada", async () => {
    const cutoff = new Date("2026-10-28T16:00:00.000Z");
    const slot = await createDeliverySlot({ orderCutoff: cutoff });

    const res = await PUT(
      putRequest({ orderCutoff: "2026-10-28T25:00" }, await adminCookieHeader()),
      { params: Promise.resolve({ id: String(slot.id) }) }
    );

    expect(res.status).toBe(400);
    const saved = await prisma.deliverySlot.findUnique({ where: { id: slot.id } });
    expect(saved?.orderCutoff?.toISOString()).toBe(cutoff.toISOString());
  });

  it("devuelve 400 si Pedidos hasta no es una fecha, y no toca la fecha guardada", async () => {
    const cutoff = new Date("2026-10-28T16:00:00.000Z");
    const slot = await createDeliverySlot({ orderCutoff: cutoff });

    const res = await PUT(
      putRequest({ orderCutoff: "28 de octubre" }, await adminCookieHeader()),
      { params: Promise.resolve({ id: String(slot.id) }) }
    );

    expect(res.status).toBe(400);
    const saved = await prisma.deliverySlot.findUnique({ where: { id: slot.id } });
    expect(saved?.orderCutoff?.toISOString()).toBe(cutoff.toISOString());
  });

  it("devuelve 400 al crear con un Pedidos hasta inválido, sin crear la fecha", async () => {
    const res = await POST(
      postRequest({ date: "2026-10-29", dayLabel: "Jueves 29 de octubre", orderCutoff: "mañana" }, await adminCookieHeader())
    );

    expect(res.status).toBe(400);
    expect(await prisma.deliverySlot.count()).toBe(0);
  });
});
