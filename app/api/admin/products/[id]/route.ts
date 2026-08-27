import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { syncProductStockForDays } from "@/lib/productStock";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const productId = parseInt(id);
  const data = await req.json();

  const prevProduct = await prisma.product.findUnique({ where: { id: productId } });
  const prevDays = new Set<string>((prevProduct?.availableDays ?? "").split(",").filter(Boolean));
  const newDays = new Set<string>(String(data.availableDays ?? "").split(",").filter(Boolean));

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      name: data.name,
      description: data.description,
      price: parseInt(data.price),
      weight: data.weight,
      ingredients: data.ingredients,
      imageUrl: data.imageUrl,
      focalX: data.focalX ?? 50,
      focalY: data.focalY ?? 50,
      imageScale: data.imageScale ?? 1,
      availableDays: data.availableDays ?? "",
      active: data.active,
      sortOrder: data.sortOrder,
    },
  });

  await syncProductStockForDays(productId, prevDays, newDays);

  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.product.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
