import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isIdConflict, resyncIdSequence } from "@/lib/idSequence";
import { syncProductStockForDays } from "@/lib/productStock";

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const products = await prisma.product.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const data = await req.json();
  const productData: Prisma.ProductCreateInput = {
    name: data.name,
    description: data.description ?? "",
    price: parseInt(data.price),
    weight: data.weight ?? "",
    ingredients: data.ingredients ?? "",
    imageUrl: data.imageUrl ?? "",
    focalX: data.focalX ?? 50,
    focalY: data.focalY ?? 50,
    imageScale: data.imageScale ?? 1,
    availableDays: data.availableDays ?? "",
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
  };

  let product;
  try {
    product = await prisma.product.create({ data: productData });
  } catch (err) {
    // La secuencia de "id" puede quedar desincronizada del MAX(id) real
    // (prisma db push --accept-data-loss recreando la tabla, restores, etc.)
    // y chocar con un id ya existente. Se resincroniza y se reintenta una vez.
    if (!isIdConflict(err)) throw err;
    await resyncIdSequence("Product");
    product = await prisma.product.create({ data: productData });
  }

  const newDays = new Set<string>(String(data.availableDays ?? "").split(",").filter(Boolean));
  await syncProductStockForDays(product.id, new Set(), newDays);

  return NextResponse.json(product, { status: 201 });
}
