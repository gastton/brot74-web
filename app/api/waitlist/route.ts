import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/lib/rateLimit";

const WAITLIST_RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };
const MAX_NAME_LENGTH = 40;

export async function POST(req: NextRequest) {
  const { allowed, resetAt } = checkRateLimit(`waitlist:${getClientIp(req)}`, WAITLIST_RATE_LIMIT);
  if (!allowed) {
    return tooManyRequestsResponse(resetAt, "Demasiados intentos. Probá de nuevo más tarde.");
  }

  try {
    const { phone, name } = await req.json();

    // v57: el nombre es obligatorio (se muestra en el admin y en la confirmación).
    const cleanedName = typeof name === "string" ? name.trim() : "";
    if (!cleanedName) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    if (cleanedName.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `El nombre puede tener hasta ${MAX_NAME_LENGTH} caracteres` }, { status: 400 });
    }

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
      update: { name: cleanedName, notified: false, createdAt: new Date() },
      create: { phone: cleaned, name: cleanedName },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
