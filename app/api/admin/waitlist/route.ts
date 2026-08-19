import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: "asc" }, // orden de llegada a la cola
  });

  return NextResponse.json(entries);
}

// Borrado en bloque: todas las filas ya avisadas (notified: true). Se usa
// desde el botón "Borrar avisados" del admin, con confirm() antes.
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { count } = await prisma.waitlistEntry.deleteMany({ where: { notified: true } });

  return NextResponse.json({ ok: true, deleted: count });
}
