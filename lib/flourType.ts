// v69 · Tipo de harina de un producto: la escala de 3 pasos de las tarjetas de
// /productos (blanco → semi integral → integral). "" = sin dato: la tarjeta no
// muestra la escala.
export const FLOUR_TYPES = ["blanco", "semi", "integral"] as const;
export type FlourType = (typeof FLOUR_TYPES)[number];

export const FLOUR_LABELS: Record<FlourType, string> = {
  blanco: "Blanco",
  semi: "Semi integral",
  integral: "Integral",
};

/** Pasos llenos de la escala (1 a 3); 0 si no hay dato o el valor no es válido. */
export function flourLevel(value: string): number {
  return FLOUR_TYPES.indexOf(value as FlourType) + 1;
}

/**
 * Valida lo que llega del admin (POST/PUT). undefined = no vino en el pedido
 * (el PUT no lo toca); "" = sin dato. Cualquier otro valor → error.
 */
export function parseFlourType(raw: unknown): { flourType: string | undefined } | { error: string } {
  if (raw === undefined) return { flourType: undefined };
  if (raw === "" || raw === null) return { flourType: "" };
  if (typeof raw === "string" && (FLOUR_TYPES as readonly string[]).includes(raw)) return { flourType: raw };
  return { error: "Tipo de harina inválido: tiene que ser blanco, semi o integral." };
}
