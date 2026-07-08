import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/products/route";
import { createProduct, createDeliverySlot, createProductStock, createCartReservation } from "../helpers/factories";

function getRequest(query = "") {
  return new NextRequest(`http://localhost/api/products${query}`);
}

describe("GET /api/products", () => {
  it("solo devuelve productos activos, ordenados por sortOrder", async () => {
    await createProduct({ name: "Segundo", sortOrder: 2, active: true });
    await createProduct({ name: "Inactivo", sortOrder: 0, active: false });
    await createProduct({ name: "Primero", sortOrder: 1, active: true });

    const res = await GET(getRequest());
    const json = await res.json();

    expect(json.map((p: { name: string }) => p.name)).toEqual(["Primero", "Segundo"]);
  });

  it("sin slotId, devuelve stock null y hasStock true", async () => {
    await createProduct();

    const res = await GET(getRequest());
    const json = await res.json();

    expect(json[0].stock).toBeNull();
    expect(json[0].hasStock).toBe(true);
  });

  it("con slotId, calcula el stock disponible descontando reservas de carrito activas", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 10, reservedStock: 2 });
    await createCartReservation(product.id, slot.id, { quantity: 3 });

    const res = await GET(getRequest(`?slotId=${slot.id}`));
    const json = await res.json();

    expect(json[0].stock).toBe(5);
    expect(json[0].hasStock).toBe(true);
  });

  it("con slotId, ignora reservas de carrito expiradas", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5, reservedStock: 0 });
    await createCartReservation(product.id, slot.id, { quantity: 5, expiresAt: new Date(Date.now() - 1000) });

    const res = await GET(getRequest(`?slotId=${slot.id}`));
    const json = await res.json();

    expect(json[0].stock).toBe(5);
    expect(json[0].hasStock).toBe(true);
  });

  it("con slotId, un producto sin registro de stock queda con stock null y hasStock true", async () => {
    await createProduct();
    const slot = await createDeliverySlot();

    const res = await GET(getRequest(`?slotId=${slot.id}`));
    const json = await res.json();

    expect(json[0].stock).toBeNull();
    expect(json[0].hasStock).toBe(true);
  });

  it("con slotId, hasStock es false cuando el disponible es 0", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 2, reservedStock: 2 });

    const res = await GET(getRequest(`?slotId=${slot.id}`));
    const json = await res.json();

    expect(json[0].stock).toBe(0);
    expect(json[0].hasStock).toBe(false);
  });
});
