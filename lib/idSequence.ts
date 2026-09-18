import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * Resincroniza la secuencia autoincremental de `id` de una tabla con el
 * MAX(id) real de sus filas.
 *
 * `prisma db push --accept-data-loss` corre en cada build de producción
 * (ver BRT-112) y puede recrear una tabla sin preservar el estado de su
 * secuencia si en algún momento hubo filas insertadas con `id` explícito
 * (seed, restore, import). La secuencia queda por detrás del máximo real y
 * la próxima inserción autoincremental choca con un id ya existente
 * (Prisma P2002 en el campo "id"). Ver BRT-119.
 */
export async function resyncIdSequence(tableName: string) {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX(id) + 1 FROM "${tableName}"), 1), false)`
  );
}

/**
 * True si el error es un choque de unique constraint (P2002) sobre el
 * campo "id" — específicamente la primary key, no cualquier otro unique
 * constraint del modelo (ej. `ProductStock` tiene uno compuesto).
 *
 * BRT-179 (Prisma 7): con el driver adapter, `err.meta` dejó de traer el
 * `target` semántico (`['id']`) que ponía el motor en Rust — ahora viene
 * el error crudo de Postgres en `meta.driverAdapterError.cause`, con el
 * nombre del constraint (`constraint.index`), no el nombre del campo. Para
 * una primary key, Postgres/Prisma nombran ese índice `"<Tabla>_pkey"` por
 * convención — se detecta por ahí. Se deja también el chequeo viejo por
 * `target` como fallback, no debería doler.
 */
export function isIdConflict(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return false;
  }

  const meta = err.meta as
    | { target?: unknown; driverAdapterError?: { cause?: { constraint?: { index?: unknown } } } }
    | undefined;

  if (Array.isArray(meta?.target)) {
    return (meta.target as unknown[]).includes("id");
  }

  const constraintIndex = meta?.driverAdapterError?.cause?.constraint?.index;
  return typeof constraintIndex === "string" && constraintIndex.endsWith("_pkey");
}
