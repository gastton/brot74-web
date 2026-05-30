import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding BROT.74 database...");

  // Clear existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productStock.deleteMany();
  await prisma.deliverySlot.deleteMany();
  await prisma.product.deleteMany();

  // Products
  const products = await prisma.product.createMany({
    data: [
      {
        name: "Full Integral",
        description: "Pan de trigo integral con semillas, nueces y miel. Rico, nutritivo y con corteza crujiente.",
        price: 6500,
        weight: "700g",
        ingredients: "Harina integral, semillas de girasol, nueces, miel, agua, sal, masa madre",
        active: true,
        sortOrder: 1,
      },
      {
        name: "Campo",
        description: "Pan de campo clásico con miga abierta y corteza dorada.",
        price: 4000,
        weight: "600g",
        ingredients: "Harina de trigo, agua, sal, masa madre",
        active: true,
        sortOrder: 2,
      },
      {
        name: "Hogaza",
        description: "Pan blanco de harina de trigo, sabor suave y miga esponjosa.",
        price: 3000,
        weight: "500g",
        ingredients: "Harina de trigo blanco, agua, sal, masa madre",
        active: true,
        sortOrder: 3,
      },
      {
        name: "Focaccia",
        description: "Focaccia italiana esponjosa, con aceite de oliva y sal en escamas.",
        price: 5000,
        weight: "400g",
        ingredients: "Harina de trigo, aceite de oliva, sal en escamas, romero, agua, masa madre",
        active: true,
        sortOrder: 4,
      },
    ],
  });

  console.log(`Created ${products.count} products`);

  const allProducts = await prisma.product.findMany({ orderBy: { sortOrder: "asc" } });

  // Next Monday
  const nextMonday = new Date();
  nextMonday.setHours(12, 0, 0, 0);
  while (nextMonday.getDay() !== 1) nextMonday.setDate(nextMonday.getDate() + 1);

  // Next Saturday
  const nextSaturday = new Date();
  nextSaturday.setHours(12, 0, 0, 0);
  while (nextSaturday.getDay() !== 6) nextSaturday.setDate(nextSaturday.getDate() + 1);

  const fmt = (d: Date) =>
    d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
      .replace(/^\w/, (c) => c.toUpperCase());

  const mondaySlot = await prisma.deliverySlot.create({
    data: { date: nextMonday, dayLabel: fmt(nextMonday), isDelivery: false, active: true },
  });

  const saturdaySlot = await prisma.deliverySlot.create({
    data: { date: nextSaturday, dayLabel: fmt(nextSaturday), isDelivery: true, active: true },
  });

  for (const product of allProducts) {
    await prisma.productStock.createMany({
      data: [
        { productId: product.id, deliverySlotId: mondaySlot.id, totalStock: 5, reservedStock: 0 },
        { productId: product.id, deliverySlotId: saturdaySlot.id, totalStock: 5, reservedStock: 0 },
      ],
    });
  }

  console.log("Created 2 delivery slots with stock (5 units each product)");
  console.log("Done! Admin password: brot74admin");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
