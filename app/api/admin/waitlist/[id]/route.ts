import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { notified } = await req.json();

  if (typeof notified !== "boolean") {
    return NextResponse.json({ error: "notified debe ser boolean" }, { status: 400 });
  }

  await prisma.waitlistEntry.update({
    where: { id: parseInt(id) },
    data: { notified },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  await prisma.waitlistEntry.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ ok: true });
}
