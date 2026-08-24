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

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
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

  return Array.from(consolidated, ([productId, quantity]) => ({
    productId,
    quantity,
  }));
}
