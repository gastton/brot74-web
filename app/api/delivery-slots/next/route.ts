import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// BRT-97: fuente de verdad pública de "¿ya hay una próxima fecha creada?" —
// a diferencia de /api/delivery-slots, NO filtra por stock ni cutoff: solo
// mira si existe una DeliverySlot activa con fecha futura. La usan el form
// de "Pedidos cerrados" (mostrar la fecha o "EN BREVE") y el admin de
// Waitlist (habilitar o no el botón de avisar por WhatsApp).
export async function GET() {
  const slot = await prisma.deliverySlot.findFirst({
    where: { active: true, date: { gte: new Date() } },
    orderBy: { date: "asc" },
    select: { date: true, dayLabel: true },
  });

  return NextResponse.json(slot ? { date: slot.date, dayLabel: slot.dayLabel } : null);
}
