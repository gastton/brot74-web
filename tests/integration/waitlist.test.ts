import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/waitlist/route";
import { prisma } from "@/lib/db";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/waitlist", {
    method: "POST",
    body: JSON.stringify(body),
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
});
