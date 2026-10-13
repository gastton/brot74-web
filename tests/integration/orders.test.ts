import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppNotification: vi.fn(),
  buildOrderMessage: vi.fn(() => "mock message"),
}));

import { POST } from "@/app/api/orders/route";
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import { prisma } from "@/lib/db";
import { createProduct, createDeliverySlot, createProductStock, getStock } from "../helpers/factories";

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

  it("crea el pedido y descuenta el stock", async () => {
    const product = await createProduct({ price: 1500 });
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5, reservedStock: 0 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 2 }] }))
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total).toBe(3000);

    const stock = await getStock(product.id, slot.id);
    expect(stock?.reservedStock).toBe(2);

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

  it("devuelve 400 si ya pasó el horario límite calculado por defecto más la tolerancia (BRT-114)", async () => {
    const product = await createProduct();
    // Entrega hace 5 horas => el cutoff por defecto (20hs antes de la fecha)
    // pasó hace 25hs, más allá de las 24hs de tolerancia.
    const slot = await createDeliverySlot({ date: new Date(Date.now() - 5 * 60 * 60 * 1000) });
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 400 si ya pasó un orderCutoff explícito más la tolerancia, aunque la fecha de entrega sea futura (BRT-114)", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot({ orderCutoff: new Date(Date.now() - 25 * 60 * 60 * 1000) });
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
    );

    expect(res.status).toBe(400);
  });

  it("acepta un pedido después del cierre pero dentro de la tolerancia (quien ya estaba en el flujo)", async () => {
    const product = await createProduct();
    // Cerró hace 1 hora; todavía faltan 23 de las 24 de tolerancia.
    const slot = await createDeliverySlot({ orderCutoff: new Date(Date.now() - 60 * 60 * 1000) });
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }))
    );

    expect(res.status).toBe(200);
  });

  it("ignora un sessionToken enviado por clientes viejos: ya no existen reservas por tiempo", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 5 });

    const res = await POST(
      makeRequest(
        baseOrder({
          deliverySlotId: slot.id,
          items: [{ productId: product.id, quantity: 1 }],
          sessionToken: crypto.randomUUID(),
        })
      )
    );

    expect(res.status).toBe(200);
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
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 3 }] }))
    );

    expect(res.status).toBe(400);
  });

  it("acepta exactamente 3 unidades del mismo pan en un pedido", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 100 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 3 }] }))
    );

    expect(res.status).toBe(200);
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(3);
  });

  it("devuelve 400 si se piden más de 3 unidades del mismo pan, aunque haya stock", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 100 });

    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 4 }] }))
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/Máximo 3/);
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(0);
  });

  it("el tope de 3 aplica al total del pan: líneas repetidas que suman más de 3 se rechazan", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 100 });

    const res = await POST(
      makeRequest(
        baseOrder({
          deliverySlotId: slot.id,
          items: [
            { productId: product.id, quantity: 2 },
            { productId: product.id, quantity: 2 },
          ],
        })
      )
    );

    expect(res.status).toBe(400);
  });

  it("el tope de 3 es por pan: se pueden pedir 3 de un pan y 3 de otro en el mismo pedido", async () => {
    const a = await createProduct({ price: 1000 });
    const b = await createProduct({ price: 2000 });
    const slot = await createDeliverySlot();
    await createProductStock(a.id, slot.id, { totalStock: 100 });
    await createProductStock(b.id, slot.id, { totalStock: 100 });

    const res = await POST(
      makeRequest(
        baseOrder({
          deliverySlotId: slot.id,
          items: [
            { productId: a.id, quantity: 3 },
            { productId: b.id, quantity: 3 },
          ],
        })
      )
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total).toBe(9000);
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
    await createProductStock(product.id, slot.id, { totalStock: 2 });

    const res = await POST(
      makeRequest(
        baseOrder({
          deliverySlotId: slot.id,
          items: [
            { productId: product.id, quantity: 2 },
            { productId: product.id, quantity: 1 },
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

  it("pedidos de usuarios distintos no se bloquean entre sí: sin reservas, el stock solo baja con pedidos confirmados", async () => {
    const product = await createProduct();
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 100, reservedStock: 0 });

    const body = baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 3 }] });
    const first = await POST(makeRequest(body));
    const second = await POST(makeRequest(body));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(6);
  });
});
