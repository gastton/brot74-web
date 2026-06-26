import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    const cleaned = (phone ?? "").replace(/\D/g, "");
    if (cleaned.length < 7 || cleaned.length > 15) {
      return NextResponse.json({ error: "Número inválido" }, { status: 400 });
    }

    await prisma.waitlistEntry.create({ data: { phone: cleaned } });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
