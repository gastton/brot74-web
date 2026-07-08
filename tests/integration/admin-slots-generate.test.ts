import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/slots/generate/route";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot } from "../helpers/factories";
import { adminCookieHeader } from "../helpers/auth";

const YEAR = 2027;
const MONTH = 3; // marzo 2027, elegido fijo para que el test sea determinístico

function countTargetDays(): number {
  let count = 0;
  const cursor = new Date(YEAR, MONTH - 1, 1);
  while (cursor.getMonth() === MONTH - 1) {
    if (cursor.getDay() === 1 || cursor.getDay() === 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/slots/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

describe("POST /api/admin/slots/generate", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await POST(postRequest({ year: YEAR, month: MONTH }));
    expect(res.status).toBe(401);
  });

  it("genera un slot por cada lunes y sábado del mes", async () => {
    const res = await POST(postRequest({ year: YEAR, month: MONTH }, await adminCookieHeader()));
    const json = await res.json();

    const expected = countTargetDays();
    expect(json.created).toBe(expected);
    expect(json.skipped).toBe(0);

    const slots = await prisma.deliverySlot.findMany({
      where: { date: { gte: new Date(YEAR, MONTH - 1, 1), lte: new Date(YEAR, MONTH, 0, 23, 59, 59) } },
    });
    expect(slots).toHaveLength(expected);
  });

  it("no duplica un slot que ya existe en esa fecha", async () => {
    const cursor = new Date(YEAR, MONTH - 1, 1);
    while (cursor.getDay() !== 1) cursor.setDate(cursor.getDate() + 1);
    const firstMonday = new Date(cursor);
    firstMonday.setHours(12, 0, 0, 0);
    await createDeliverySlot({ date: firstMonday, dayLabel: "Ya existía" });

    const res = await POST(postRequest({ year: YEAR, month: MONTH }, await adminCookieHeader()));
    const json = await res.json();

    const expected = countTargetDays();
    expect(json.created).toBe(expected - 1);
    expect(json.skipped).toBe(1);
  });

  it("inicializa stock solo para productos disponibles ese día de la semana", async () => {
    const lunesOnly = await createProduct({ availableDays: "lunes" });
    const sabadoOnly = await createProduct({ availableDays: "sabado" });

    await POST(postRequest({ year: YEAR, month: MONTH }, await adminCookieHeader()));

    const slotsInMonth = await prisma.deliverySlot.findMany({
      where: { date: { gte: new Date(YEAR, MONTH - 1, 1), lte: new Date(YEAR, MONTH, 0, 23, 59, 59) } },
    });
    const mondaySlot = slotsInMonth.find((s) => new Date(s.date).getDay() === 1);
    const mondayStocks = await prisma.productStock.findMany({ where: { deliverySlotId: mondaySlot!.id } });
    const stockedProductIds = mondayStocks.map((s) => s.productId);

    expect(stockedProductIds).toContain(lunesOnly.id);
    expect(stockedProductIds).not.toContain(sabadoOnly.id);
  });
});
