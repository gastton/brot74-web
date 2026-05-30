import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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
  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description ?? "",
      price: parseInt(data.price),
      weight: data.weight ?? "",
      ingredients: data.ingredients ?? "",
      imageUrl: data.imageUrl ?? "",
      focalX: data.focalX ?? 50,
      focalY: data.focalY ?? 50,
      active: data.active ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  return NextResponse.json(product, { status: 201 });
}
