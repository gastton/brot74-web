import { prisma } from "@/lib/db";

// BRT-268: claves válidas de FeatureFlag. Una clave que no está acá no se
// puede leer ni cambiar desde los endpoints.
export const FEATURE_FLAGS = {
  // BRT-248: botón "Pagar con Mercado Pago" en el checkout. Apagado = solo
  // transferencia al alias, como antes. El webhook de MP NO mira este flag:
  // un pago ya iniciado se confirma aunque se apague a mitad de camino.
  mpCheckout: "mpCheckout",
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export function isFeatureFlagKey(key: unknown): key is FeatureFlagKey {
  return typeof key === "string" && Object.hasOwn(FEATURE_FLAGS, key);
}

/** Estado de todos los flags conocidos. Sin fila en la base = apagado. */
export async function getFeatureFlags(): Promise<Record<FeatureFlagKey, boolean>> {
  const rows = await prisma.featureFlag.findMany();
  const enabled = new Set(rows.filter((r) => r.enabled).map((r) => r.key));
  const keys = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];
  return Object.fromEntries(keys.map((key) => [key, enabled.has(key)])) as Record<FeatureFlagKey, boolean>;
}

export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const row = await prisma.featureFlag.findUnique({ where: { key } });
  return row?.enabled ?? false;
}

export async function setFeatureFlag(key: FeatureFlagKey, enabled: boolean) {
  await prisma.featureFlag.upsert({
    where: { key },
    create: { key, enabled },
    update: { enabled },
  });
}
