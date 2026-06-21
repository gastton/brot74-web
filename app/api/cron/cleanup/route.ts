import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { count } = await prisma.cartReservation.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return NextResponse.json({ ok: true, deleted: count });
}
