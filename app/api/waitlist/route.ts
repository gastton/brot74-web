import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/lib/rateLimit";

const WAITLIST_RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const { allowed, resetAt } = checkRateLimit(`waitlist:${getClientIp(req)}`, WAITLIST_RATE_LIMIT);
  if (!allowed) {
    return tooManyRequestsResponse(resetAt, "Demasiados intentos. Probá de nuevo más tarde.");
  }

  try {
    const { phone } = await req.json();

    const cleaned = (phone ?? "").replace(/\D/g, "");
    if (cleaned.length < 7 || cleaned.length > 15) {
      return NextResponse.json({ error: "Número inválido" }, { status: 400 });
    }

    // BRT-97: upsert por teléfono en vez de create — si la misma persona ya
    // se había anotado, no duplicamos la fila; la volvemos a poner al final
    // de la cola (createdAt) y le reseteamos "notified" por si ya se le
    // había avisado en una ronda anterior.
    await prisma.waitlistEntry.upsert({
      where: { phone: cleaned },
      update: { notified: false, createdAt: new Date() },
      create: { phone: cleaned },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
