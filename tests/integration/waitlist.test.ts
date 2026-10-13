import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/waitlist/route";
import { prisma } from "@/lib/db";

function postRequest(body: unknown, ip?: string) {
  return new NextRequest("http://localhost/api/waitlist", {
    method: "POST",
    body: JSON.stringify(body),
    headers: ip ? { "x-forwarded-for": ip } : undefined,
  });
}

describe("POST /api/waitlist", () => {
  it("crea la entrada limpiando el número a solo dígitos", async () => {
    const res = await POST(postRequest({ phone: "+54 9 11 2233-4455" }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);

    const entries = await prisma.waitlistEntry.findMany();
    expect(entries).toHaveLength(1);
    expect(entries[0].phone).toBe("5491122334455");
  });

  it("devuelve 400 si el número tiene menos de 7 dígitos", async () => {
    const res = await POST(postRequest({ phone: "12345" }));
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si el número tiene más de 15 dígitos", async () => {
    const res = await POST(postRequest({ phone: "1234567890123456" }));
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si no llega ningún número", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("no duplica la fila si el mismo teléfono se envía dos veces (BRT-97)", async () => {
    await POST(postRequest({ phone: "3513845646" }));
    const first = await prisma.waitlistEntry.findFirstOrThrow({ where: { phone: "3513845646" } });
    await prisma.waitlistEntry.update({ where: { id: first.id }, data: { notified: true } });

    const res = await POST(postRequest({ phone: "3513845646" }));
    expect(res.status).toBe(201);

    const entries = await prisma.waitlistEntry.findMany({ where: { phone: "3513845646" } });
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(first.id);
    expect(entries[0].notified).toBe(false); // vuelve a "no avisado" al reanotarse
  });

  it("responde 429 con Retry-After al pasar de 10 intentos por hora desde la misma IP, sin guardar el número", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await POST(postRequest({ phone: `35138456${String(i).padStart(2, "0")}` }, "203.0.113.7"));
      expect(res.status).toBe(201);
    }

    const blocked = await POST(postRequest({ phone: "3513999999" }, "203.0.113.7"));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(await prisma.waitlistEntry.findFirst({ where: { phone: "3513999999" } })).toBeNull();

    // Otra IP sigue pudiendo anotarse.
    const other = await POST(postRequest({ phone: "3513999999" }, "198.51.100.9"));
    expect(other.status).toBe(201);
  });
});
