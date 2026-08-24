/**
 * Valida y normaliza los `items` que llegan del cliente en
 * /api/cart/reserve y /api/orders (BRT-108).
 *
 * - Rechaza cualquier `productId`/`quantity` que no sea un entero positivo.
 * - Consolida líneas repetidas del mismo `productId`, sumando cantidades,
 *   para que no se pueda superar el stock disponible partiendo el mismo
 *   pedido en varias líneas.
 */

export type CartItem = {
  productId: number;
  quantity: number;
};

// Los campos correspondientes son Int en el schema de Prisma (32 bits).
// Un valor más grande rompe en la query con un error feo (500) en vez de
// un 400 limpio.
const MAX_INT32 = 2147483647;

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAX_INT32
  );
}

export function normalizeCartItems(items: unknown): CartItem[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  const consolidated = new Map<number, number>();

  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) return null;

    const { productId, quantity } = raw as Record<string, unknown>;

    if (!isPositiveInteger(productId) || !isPositiveInteger(quantity)) {
      return null;
    }

    consolidated.set(productId, (consolidated.get(productId) ?? 0) + quantity);
  }

  // La suma de líneas duplicadas también puede superar el límite aunque
  // cada línea individual estuviera dentro de rango.
  for (const quantity of consolidated.values()) {
    if (quantity > MAX_INT32) return null;
  }

  return Array.from(consolidated, ([productId, quantity]) => ({
    productId,
    quantity,
  }));
}
