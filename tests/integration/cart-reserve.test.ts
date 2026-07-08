import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/cart/reserve/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createProductStock, createCartReservation } from "../helpers/factories";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/cart/reserve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/cart/reserve", () => {
  it("reserva stock y devuelve un sessionToken", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await POST(makeRequest({ slotId: slot.id, items: [{ productId: product.id, quantity: 2 }] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sessionToken).toBeTruthy();

    const reservations = await prisma.cartReservation.findMany({ where: { sessionToken: json.sessionToken } });
    expect(reservations).toHaveLength(1);
    expect(reservations[0].quantity).toBe(2);
  });

  it("devuelve 409 cuando el stock disponible es insuficiente", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 2 });

    const res = await POST(makeRequest({ slotId: slot.id, items: [{ productId: product.id, quantity: 3 }] }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.productId).toBe(product.id);
  });

  it("ignora reservas de carrito expiradas al calcular disponibilidad", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 3 });
    await createCartReservation(product.id, slot.id, { quantity: 3, expiresAt: new Date(Date.now() - 60_000) });

    const res = await POST(makeRequest({ slotId: slot.id, items: [{ productId: product.id, quantity: 3 }] }));

    expect(res.status).toBe(200);
  });

  it("devuelve 400 si falta slotId o items", async () => {
    const res = await POST(makeRequest({ slotId: null, items: [] }));
    expect(res.status).toBe(400);
  });
});
