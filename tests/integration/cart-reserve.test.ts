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

  it("devuelve 400 con quantity negativa, cero, o no entera (BRT-108)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    for (const quantity of [-5, 0, 1.5]) {
      const res = await POST(
        makeRequest({ slotId: slot.id, items: [{ productId: product.id, quantity }] })
      );
      expect(res.status).toBe(400);
    }

    const reservations = await prisma.cartReservation.findMany({ where: { productId: product.id } });
    expect(reservations).toHaveLength(0);
  });

  it("consolida líneas duplicadas del mismo productId antes de validar stock (BRT-108)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    // 3 + 3 = 6, supera el stock total de 5 aunque cada línea individual
    // (3) esté por debajo.
    const res = await POST(
      makeRequest({
        slotId: slot.id,
        items: [
          { productId: product.id, quantity: 3 },
          { productId: product.id, quantity: 3 },
        ],
      })
    );

    expect(res.status).toBe(409);
  });
});
