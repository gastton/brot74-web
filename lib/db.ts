import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

// BRT-179 (Prisma 7): el driver adapter es obligatorio para el runtime —
// ya no alcanza con pasarle la URL directo al PrismaClient. Usa
// DATABASE_URL (pooled) — la misma que usaba `url` en schema.prisma antes
// de esta migración. La URL sin pooler (DIRECT_URL) la usa el CLI, aparte,
// en prisma.config.ts.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
