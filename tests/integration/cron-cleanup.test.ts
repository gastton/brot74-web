import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/cleanup/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createCartReservation } from "../helpers/factories";

const originalCronSecret = process.env.CRON_SECRET;

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/cleanup", { headers });
}

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
});

describe("GET /api/cron/cleanup", () => {
  it("borra solo las reservas de carrito expiradas", async () => {
    process.env.CRON_SECRET = "mi-secreto";
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createCartReservation(product.id, slot.id, { expiresAt: new Date(Date.now() - 60_000) });
    const active = await createCartReservation(product.id, slot.id, { expiresAt: new Date(Date.now() + 60_000) });

    const res = await GET(getRequest({ authorization: "Bearer mi-secreto" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.deleted).toBe(1);

    const remaining = await prisma.cartReservation.findMany();
    expect(remaining.map((r) => r.id)).toEqual([active.id]);
  });

  it("sin CRON_SECRET configurado, rechaza el request en vez de dejarlo abierto (BRT-115)", async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(getRequest());
    expect(res.status).toBe(401);

    const resWithHeader = await GET(getRequest({ authorization: "Bearer lo-que-sea" }));
    expect(resWithHeader.status).toBe(401);
  });

  it("con CRON_SECRET configurado, devuelve 401 sin el header correcto", async () => {
    process.env.CRON_SECRET = "mi-secreto";

    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("con CRON_SECRET configurado, devuelve 200 con el Bearer correcto", async () => {
    process.env.CRON_SECRET = "mi-secreto";

    const res = await GET(getRequest({ authorization: "Bearer mi-secreto" }));
    expect(res.status).toBe(200);
  });
});
