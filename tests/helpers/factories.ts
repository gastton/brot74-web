import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

let productCounter = 0;
let slotCounter = 0;

export async function createProduct(overrides: Partial<Prisma.ProductUncheckedCreateInput> = {}) {
  productCounter += 1;
  return prisma.product.create({
    data: {
      name: `Producto ${productCounter}`,
      price: 1000,
      active: true,
      ...overrides,
    },
  });
}

export async function createDeliverySlot(overrides: Partial<Prisma.DeliverySlotUncheckedCreateInput> = {}) {
  slotCounter += 1;
  const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  return prisma.deliverySlot.create({
    data: {
      date: inTwoDays,
      dayLabel: `Slot ${slotCounter}`,
      deliveryMode: "both",
      active: true,
      ...overrides,
    },
  });
}

export async function createProductStock(
  productId: number,
  deliverySlotId: number,
  overrides: Partial<Prisma.ProductStockUncheckedCreateInput> = {}
) {
  return prisma.productStock.create({
    data: {
      productId,
      deliverySlotId,
      totalStock: 10,
      reservedStock: 0,
      ...overrides,
    },
  });
}

export async function createCartReservation(
  productId: number,
  deliverySlotId: number,
  overrides: Partial<Prisma.CartReservationUncheckedCreateInput> = {}
) {
  const in15Min = new Date(Date.now() + 15 * 60 * 1000);
  return prisma.cartReservation.create({
    data: {
      productId,
      deliverySlotId,
      quantity: 1,
      sessionToken: crypto.randomUUID(),
      expiresAt: in15Min,
      ...overrides,
    },
  });
}
