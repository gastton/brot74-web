import { execSync } from "node:child_process";
import dotenv from "dotenv";
import { beforeAll, afterEach, afterAll } from "vitest";

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: ".env.test" });
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL no está definida. Copiá .env.test.example a .env.test o corré `npm run test:db:up` primero."
  );
}

if (!/localhost|127\.0\.0\.1|postgres:5432/.test(process.env.DATABASE_URL)) {
  throw new Error(
    `DATABASE_URL apunta a un host que no parece ser la DB de test local/CI: ${process.env.DATABASE_URL}. Abortando para no correr tests contra una DB real.`
  );
}

if (process.env.DIRECT_URL && !/localhost|127\.0\.0\.1|postgres:5432/.test(process.env.DIRECT_URL)) {
  throw new Error(
    `DIRECT_URL apunta a un host que no parece ser la DB de test local/CI: ${process.env.DIRECT_URL}. Abortando para no correr tests contra una DB real.`
  );
}

for (const name of ["ADMIN_PASSWORD", "JWT_SECRET", "DIRECT_URL"] as const) {
  if (!process.env[name]) {
    throw new Error(
      `${name} no está definida. Copiá .env.test.example a .env.test (o corré \`npm run test:db:up\`) y completá los valores de test.`
    );
  }
}

import { prisma } from "@/lib/db";

beforeAll(() => {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: process.env,
  });
});

afterEach(async () => {
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartReservation.deleteMany(),
    prisma.productStock.deleteMany(),
    prisma.product.deleteMany(),
    prisma.deliverySlot.deleteMany(),
    prisma.waitlistEntry.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
