// v51 · Descuento de producto.
// Un producto tiene descuento vigente solo si está prendido y el precio con
// descuento es válido (> 0 y menor al precio). Si no, se cobra el precio.
export type Priced = { price: number; discountActive: boolean; discountPrice: number | null };

export function hasDiscount(p: Priced): boolean {
  return p.discountActive && p.discountPrice != null && p.discountPrice > 0 && p.discountPrice < p.price;
}

export function effectivePrice(p: Priced): number {
  return hasDiscount(p) ? (p.discountPrice as number) : p.price;
}

// Valida lo que llega del admin (POST/PUT). Con el descuento apagado se
// conserva el valor cargado (para no tener que recargarlo al volver a prender).
export function parseDiscount(data: { price?: unknown; discountActive?: unknown; discountPrice?: unknown }):
  { discountActive: boolean; discountPrice: number | null } | { error: string } {
  const discountActive = data.discountActive === true || data.discountActive === "true";
  const raw = data.discountPrice;
  const n = raw === "" || raw == null ? null : parseInt(String(raw), 10);
  const discountPrice = n != null && Number.isFinite(n) ? n : null;
  if (discountActive) {
    const price = parseInt(String(data.price), 10);
    if (discountPrice == null) return { error: "Cargá el precio con descuento." };
    if (discountPrice <= 0 || !(discountPrice < price)) return { error: "El precio con descuento tiene que ser menor al precio original." };
  }
  return { discountActive, discountPrice };
}
