import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppNotification: vi.fn(),
  buildOrderMessage: vi.fn(() => "mock message"),
}));

import { POST } from "@/app/api/orders/route";
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createProductStock, createCartReservation, getStock } from "../helpers/factories";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    customerName: "Gaston",
    customerPhone: "1122334455",
    deliverySlotId: 0,
    items: [{ productId: 0, quantity: 1 }],
    ...overrides,
  };
}

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.mocked(sendWhatsAppNotification).mockReset();
  });

  it("crea el pedido, reserva stock y libera la reserva de carrito", async () => {
    const product = await createProduct({ price: 1500 });
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5, reservedStock: 0 });
    const sessionToken = crypto.randomUUID();
    await createCartReservation(product.id, slot.id, { sessionToken, quantity: 2 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 2 }], sessionToken }))
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total).toBe(3000);

    const stock = await getStock(product.id, slot.id);
    expect(stock?.reservedStock).toBe(2);

    const cartReservations = await prisma.cartReservation.findMany({ where: { sessionToken } });
    expect(cartReservations).toHaveLength(0);

    const order = await prisma.order.findUnique({ where: { id: json.orderId }, include: { items: true } });
    expect(order?.items).toHaveLength(1);
  });

  it("devuelve 400 si el slot está inactivo", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot({ active: false });
    await createProductStock(product.id, slot.id);

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 400 si ya pasó el horario límite calculado por defecto (BRT-114)", async () => {
    const product = await createProduct();
    // Entrega en 1 hora => el cutoff por defecto (20hs antes de la fecha)
    // ya pasó hace 19hs.
    const slot = await createDeliverySlot({ date: new Date(Date.now() + 60 * 60 * 1000) });
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 400 si ya pasó un orderCutoff explícito, aunque la fecha de entrega sea futura (BRT-114)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot({ orderCutoff: new Date(Date.now() - 60_000) });
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
    );

    expect(res.status).toBe(400);
  });

  it("crea el pedido normalmente si todavía no pasó el cutoff (BRT-114)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
    );

    expect(res.status).toBe(200);
  });

  it("devuelve 400 si el stock es insuficiente", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 1 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 5 }] }))
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 409 si el sessionToken expiró o no cubre la cantidad pedida", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5 });
    const sessionToken = crypto.randomUUID();
    await createCartReservation(product.id, slot.id, { sessionToken, expiresAt: new Date(Date.now() - 1000) });

    const res = await POST(
      makeRequest(
        baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }], sessionToken })
      )
    );

    expect(res.status).toBe(409);
  });

  it("crea el pedido igual si falla la notificación de WhatsApp", async () => {
    vi.mocked(sendWhatsAppNotification).mockRejectedValueOnce(new Error("network down"));

    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
    );

    expect(res.status).toBe(200);
  });

  it("devuelve 400 con quantity negativa, cero, o no entera (BRT-108)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    for (const quantity of [-5, 0, 1.5, 2147483648]) {
      const res = await POST(
        makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity }] }))
      );
      expect(res.status).toBe(400);
    }

    const orders = await prisma.order.findMany();
    expect(orders).toHaveLength(0);
  });

  it("consolida líneas duplicadas del mismo productId antes de validar stock (BRT-108)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await POST(
      makeRequest(
        baseOrder({
          deliverySlotId: slot.id,
          items: [
            { productId: product.id, quantity: 3 },
            { productId: product.id, quantity: 3 },
          ],
        })
      )
    );

    expect(res.status).toBe(400);
  });

  it("evita sobreventa con dos pedidos concurrentes por el último stock (BRT-109)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 1, reservedStock: 0 });

    const [resA, resB] = await Promise.all([
      POST(
        makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
      ),
      POST(
        makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
      ),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const stock = await getStock(product.id, slot.id);
    expect(stock?.reservedStock).toBe(1);

    const orders = await prisma.order.findMany();
    expect(orders).toHaveLength(1);
  });

  it("no deadlockea con pedidos concurrentes que comparten productos en orden inverso (BRT-109)", async () => {
    const productA = await createProduct();
    const productB = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(productA.id, slot.id, { totalStock: 5 });
    await createProductStock(productB.id, slot.id, { totalStock: 5 });

    const [resA, resB] = await Promise.all([
      POST(
        makeRequest(
          baseOrder({
            deliverySlotId: slot.id,
            items: [
              { productId: productA.id, quantity: 1 },
              { productId: productB.id, quantity: 1 },
            ],
          })
        )
      ),
      POST(
        makeRequest(
          baseOrder({
            deliverySlotId: slot.id,
            items: [
              { productId: productB.id, quantity: 1 },
              { productId: productA.id, quantity: 1 },
            ],
          })
        )
      ),
    ]);

    // Con stock de sobra para ambos, si hubiera un deadlock por orden de
    // locks inconsistente, Postgres abortaría una de las dos transacciones
    // y devolveríamos 500 en vez de 200.
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
  });

  it("devuelve 400 si no existe ProductStock para el producto+fecha (BRT-113)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    // A propósito: no se crea ProductStock para este producto+fecha.

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
    );

    expect(res.status).toBe(400);

    const orders = await prisma.order.findMany();
    expect(orders).toHaveLength(0);
  });

  it("crea el pedido normalmente cuando sí existe ProductStock (BRT-113)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
    );

    expect(res.status).toBe(200);
  });

  it("solo consume la reserva de carrito de la fecha del pedido, no las de otras fechas (BRT-110)", async () => {
    const product = await createProduct();
    const slotA = await createDeliverySlot();
    const slotB = await createDeliverySlot();
    await createProductStock(product.id, slotA.id, { totalStock: 5 });
    await createProductStock(product.id, slotB.id, { totalStock: 5 });

    const sessionToken = crypto.randomUUID();
    await createCartReservation(product.id, slotA.id, { sessionToken, quantity: 1 });
    // Reserva activa para slotB, con el mismo productId — no debería
    // confundirse con la de slotA ni borrarse al confirmar el pedido de A.
    await createCartReservation(product.id, slotB.id, { sessionToken, quantity: 2 });

    const res = await POST(
      makeRequest(
        baseOrder({
          deliverySlotId: slotA.id,
          items: [{ productId: product.id, quantity: 1 }],
          sessionToken,
        })
      )
    );

    expect(res.status).toBe(200);

    const reservationsA = await prisma.cartReservation.findMany({
      where: { sessionToken, deliverySlotId: slotA.id },
    });
    expect(reservationsA).toHaveLength(0);

    const reservationsB = await prisma.cartReservation.findMany({
      where: { sessionToken, deliverySlotId: slotB.id },
    });
    expect(reservationsB).toHaveLength(1);
    expect(reservationsB[0].quantity).toBe(2);
  });

  it("devuelve 409 si el sessionToken no tiene reserva para la fecha del pedido (BRT-110)", async () => {
    const product = await createProduct();
    const slotA = await createDeliverySlot();
    const slotB = await createDeliverySlot();
    await createProductStock(product.id, slotA.id, { totalStock: 5 });
    await createProductStock(product.id, slotB.id, { totalStock: 5 });

    const sessionToken = crypto.randomUUID();
    // Reserva únicamente para slotB — el pedido es para slotA.
    await createCartReservation(product.id, slotB.id, { sessionToken, quantity: 1 });

    const res = await POST(
      makeRequest(
        baseOrder({
          deliverySlotId: slotA.id,
          items: [{ productId: product.id, quantity: 1 }],
          sessionToken,
        })
      )
    );

    expect(res.status).toBe(409);

    const reservationsB = await prisma.cartReservation.findMany({
      where: { sessionToken, deliverySlotId: slotB.id },
    });
    expect(reservationsB).toHaveLength(1);
  });
});
