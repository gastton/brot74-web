import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/delivery-slots/route";
import { createProduct, createDeliverySlot, createProductStock } from "../helpers/factories";

const HOUR = 60 * 60 * 1000;

describe("GET /api/delivery-slots", () => {
  it("devuelve un slot activo con stock disponible", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot({ date: new Date(Date.now() + 30 * HOUR) });
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await GET();
    const json = await res.json();

    expect(json.map((s: { id: number }) => s.id)).toContain(slot.id);
  });

  it("devuelve el tipo de entrega de cada fecha", async () => {
    const product = await createProduct();
    const pickup = await createDeliverySlot({ date: new Date(Date.now() + 30 * HOUR) });
    const delivery = await createDeliverySlot({ date: new Date(Date.now() + 40 * HOUR), deliveryMode: "delivery" });
    await createProductStock(product.id, pickup.id, { totalStock: 5 });
    await createProductStock(product.id, delivery.id, { totalStock: 5 });

    const res = await GET();
    const json = await res.json();

    const byId = Object.fromEntries(json.map((s: { id: number; deliveryMode: string }) => [s.id, s.deliveryMode]));
    expect(byId[pickup.id]).toBe("pickup");
    expect(byId[delivery.id]).toBe("delivery");
  });

  it("no devuelve un slot cuyo cutoff por defecto (20hs antes) ya pasó", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot({ date: new Date(Date.now() + 5 * HOUR) });
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await GET();
    const json = await res.json();

    expect(json.map((s: { id: number }) => s.id)).not.toContain(slot.id);
  });

  it("no devuelve un slot con orderCutoff custom ya pasado, aunque la fecha sea futura", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot({
      date: new Date(Date.now() + 5 * 24 * HOUR),
      orderCutoff: new Date(Date.now() - HOUR),
    });
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await GET();
    const json = await res.json();

    expect(json.map((s: { id: number }) => s.id)).not.toContain(slot.id);
  });

  it("no devuelve un slot sin stock disponible", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot({ date: new Date(Date.now() + 30 * HOUR) });
    await createProductStock(product.id, slot.id, { totalStock: 0 });

    const res = await GET();
    const json = await res.json();

    expect(json.map((s: { id: number }) => s.id)).not.toContain(slot.id);
  });

  it("no devuelve un slot cuando todo su stock ya fue pedido", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot({ date: new Date(Date.now() + 30 * HOUR) });
    await createProductStock(product.id, slot.id, { totalStock: 2, reservedStock: 2 });

    const res = await GET();
    const json = await res.json();

    expect(json.map((s: { id: number }) => s.id)).not.toContain(slot.id);
  });

  it("devuelve un slot al que todavía le queda stock después de pedidos parciales", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot({ date: new Date(Date.now() + 30 * HOUR) });
    await createProductStock(product.id, slot.id, { totalStock: 100, reservedStock: 99 });

    const res = await GET();
    const json = await res.json();

    expect(json.map((s: { id: number }) => s.id)).toContain(slot.id);
  });

  it("devuelve como máximo 2 slots, ordenados por fecha", async () => {
    const product = await createProduct();
    const slots = await Promise.all(
      [30, 40, 50].map((h) => createDeliverySlot({ date: new Date(Date.now() + h * HOUR) }))
    );
    await Promise.all(slots.map((s) => createProductStock(product.id, s.id, { totalStock: 5 })));

    const res = await GET();
    const json = await res.json();

    expect(json).toHaveLength(2);
    expect(json[0].id).toBe(slots[0].id);
    expect(json[1].id).toBe(slots[1].id);
  });
});
