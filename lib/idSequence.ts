import { Prisma } from "@prisma/client";
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

/** True si el error es un choque de unique constraint (P2002) sobre el campo "id". */
export function isIdConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).includes("id")
  );
}
