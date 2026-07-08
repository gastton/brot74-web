import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/cart/release/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createCartReservation } from "../helpers/factories";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/cart/release", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/cart/release", () => {
  it("libera las reservas asociadas al sessionToken", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    const sessionToken = crypto.randomUUID();
    await createCartReservation(product.id, slot.id, { sessionToken });

    const res = await POST(makeRequest({ sessionToken }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);

    const remaining = await prisma.cartReservation.findMany({ where: { sessionToken } });
    expect(remaining).toHaveLength(0);
  });

  it("es un no-op si el sessionToken no existe", async () => {
    const res = await POST(makeRequest({ sessionToken: crypto.randomUUID() }));
    expect(res.status).toBe(200);
  });

  it("devuelve 400 si falta el sessionToken", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
