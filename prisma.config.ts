import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * BRT-179 (Prisma 7): reemplaza a `datasource.url`/`directUrl` en
 * schema.prisma. Esta URL la usa el **CLI** (migrate deploy/dev/resolve,
 * db push) — por eso apunta a DIRECT_URL (sin pooler): el pooler de Neon
 * (pgbouncer, modo transacción) no sostiene el advisory lock que usa
 * Prisma Migrate (ver BRT-112).
 *
 * El PrismaClient en runtime NO usa esta config — usa su propio driver
 * adapter con DATABASE_URL (pooled), en lib/db.ts.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
