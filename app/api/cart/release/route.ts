import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json();

    if (!sessionToken) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    await prisma.cartReservation.deleteMany({ where: { sessionToken } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Release error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
