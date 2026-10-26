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

function makeRequest(body: unknown, ip?: string) {
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    body: JSON.stringify(body),
    headers: ip ? { "x-forwarded-for": ip } : undefined,
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

// Arma producto + fecha + stock y hace un pedido de un solo pan: la mayoría de
// los casos solo cambian la fecha, el stock, la cantidad o algún campo extra.
async function placeSingleOrder({
  slot: slotOverrides = {},
  totalStock = 5,
  quantity = 1,
  extra = {},
}: {
  slot?: Parameters<typeof createDeliverySlot>[0];
  totalStock?: number;
  quantity?: number;
  extra?: Record<string, unknown>;
} = {}) {
  const product = await createProduct();
  const slot = await createDeliverySlot(slotOverrides);
  await createProductStock(product.id, slot.id, { totalStock });
  const res = await POST(
    makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity }], ...extra }))
  );
  return { res, product, slot };
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

  it("en una fecha de delivery guarda la dirección del cliente", async () => {
    const { res } = await placeSingleOrder({
      slot: { deliveryMode: "delivery" },
      extra: { customerAddress: "  Av. Siempreviva 742, El Talar  " },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.customerAddress).toBe("Av. Siempreviva 742, El Talar");
  });

  it("devuelve 400 en una fecha de delivery sin dirección, sin crear el pedido ni tocar el stock", async () => {
    for (const customerAddress of [undefined, "", "   ", 123]) {
      const { res, product, slot } = await placeSingleOrder({
        slot: { deliveryMode: "delivery" },
        extra: { customerAddress },
      });

      expect(res.status).toBe(400);
      expect(await prisma.order.count({ where: { deliverySlotId: slot.id } })).toBe(0);
      expect((await getStock(product.id, slot.id))?.reservedStock).toBe(0);
    }
  });

  it("en una fecha de retiro ignora la dirección que mande el cliente", async () => {
    const { res } = await placeSingleOrder({
      slot: { deliveryMode: "pickup" },
      extra: { customerAddress: "Av. Siempreviva 742" },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    const order = await prisma.order.findUnique({ where: { id: json.orderId } });
    expect(order?.customerAddress).toBe("");
  });

  it("devuelve 400 si el slot está inactivo", async () => {
    const { res } = await placeSingleOrder({ slot: { active: false } });

    expect(res.status).toBe(400);
  });

  it("devuelve 400 si ya pasó el horario límite calculado por defecto más la tolerancia (BRT-114)", async () => {
    // Entrega hace 5 horas => el cutoff por defecto (20hs antes de la fecha)
    // pasó hace 25hs, más allá de las 24hs de tolerancia.
    const { res } = await placeSingleOrder({ slot: { date: new Date(Date.now() - 5 * 60 * 60 * 1000) } });

    expect(res.status).toBe(400);
  });

  it("devuelve 400 si ya pasó un orderCutoff explícito más la tolerancia, aunque la fecha de entrega sea futura (BRT-114)", async () => {
    const { res } = await placeSingleOrder({ slot: { orderCutoff: new Date(Date.now() - 25 * 60 * 60 * 1000) } });

    expect(res.status).toBe(400);
  });

  it("acepta un pedido después del cierre pero dentro de la tolerancia (quien ya estaba en el flujo)", async () => {
    // Cerró hace 1 hora; todavía faltan 23 de las 24 de tolerancia.
    const { res } = await placeSingleOrder({ slot: { orderCutoff: new Date(Date.now() - 60 * 60 * 1000) } });

    expect(res.status).toBe(200);
  });

  it("ignora un sessionToken enviado por clientes viejos: ya no existen reservas por tiempo", async () => {
    const { res } = await placeSingleOrder({ extra: { sessionToken: crypto.randomUUID() } });

    expect(res.status).toBe(200);
  });

  it("crea el pedido normalmente si todavía no pasó el cutoff (BRT-114)", async () => {
    const { res } = await placeSingleOrder();

    expect(res.status).toBe(200);
  });

  it("devuelve 400 si el stock es insuficiente", async () => {
    const { res } = await placeSingleOrder({ totalStock: 1, quantity: 3 });

    expect(res.status).toBe(400);
  });

  it("acepta exactamente 3 unidades del mismo pan en un pedido", async () => {
    const { res, product, slot } = await placeSingleOrder({ totalStock: 100, quantity: 3 });

    expect(res.status).toBe(200);
    expect((await getStock(product.id, slot.id))?.reservedStock).toBe(3);
  });

  it("devuelve 400 si se piden más de 3 unidades del mismo pan, aunque haya stock", async () => {
    const { res, product, slot } = await placeSingleOrder({ totalStock: 100, quantity: 4 });
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

    const { res } = await placeSingleOrder();

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
    const { res } = await placeSingleOrder();

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

  describe("límite de pedidos por IP", () => {
    // Pedidos inválidos (400) alcanzan para consumir el cupo sin tocar la DB.
    async function exhaustLimit(ip: string) {
      for (let i = 0; i < 10; i++) {
        const res = await POST(makeRequest({}, ip));
        expect(res.status).toBe(400);
      }
    }

    it("responde 429 con Retry-After al pasar de 10 pedidos por hora, sin crear el pedido ni avisar por WhatsApp", async () => {
      const product = await createProduct();
      const slot = await createDeliverySlot();
      await createProductStock(product.id, slot.id, { totalStock: 100 });
      await exhaustLimit("203.0.113.7");

      const res = await POST(
        makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }), "203.0.113.7")
      );

      expect(res.status).toBe(429);
      expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
      expect(await prisma.order.count()).toBe(0);
      expect(sendWhatsAppNotification).not.toHaveBeenCalled();
    });

    it("otra IP no se ve afectada por el límite de la primera", async () => {
      const product = await createProduct();
      const slot = await createDeliverySlot();
      await createProductStock(product.id, slot.id, { totalStock: 100 });
      await exhaustLimit("203.0.113.7");

      const res = await POST(
        makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity: 1 }] }), "198.51.100.9")
      );

      expect(res.status).toBe(200);
    });
  });
});

describe("POST /api/orders con descuento (v53)", () => {
  async function orderOf(product: { id: number }, quantity: number) {
    const slot = await createDeliverySlot();
    await createProductStock(product.id, slot.id, { totalStock: 10 });
    const res = await POST(
      makeRequest(baseOrder({ deliverySlotId: slot.id, items: [{ productId: product.id, quantity }] }))
    );
    return { res, json: await res.json() };
  }

  it("con el descuento ON cobra el precio con descuento: unitPrice y total", async () => {
    const product = await createProduct({ price: 1000, discountActive: true, discountPrice: 700 });

    const { res, json } = await orderOf(product, 2);

    expect(res.status).toBe(200);
    expect(json.total).toBe(1400);
    const items = await prisma.orderItem.findMany({ where: { orderId: json.orderId } });
    expect(items[0].unitPrice).toBe(700);
  });

  it("con el descuento OFF cobra el precio original aunque haya un precio con descuento guardado", async () => {
    const product = await createProduct({ price: 1000, discountActive: false, discountPrice: 700 });

    const { json } = await orderOf(product, 2);

    expect(json.total).toBe(2000);
    const items = await prisma.orderItem.findMany({ where: { orderId: json.orderId } });
    expect(items[0].unitPrice).toBe(1000);
  });

  it("con el descuento ON pero un precio no menor al original, cobra el original", async () => {
    const product = await createProduct({ price: 1000, discountActive: true, discountPrice: 1000 });

    const { json } = await orderOf(product, 1);

    expect(json.total).toBe(1000);
  });
});
