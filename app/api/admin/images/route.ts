import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const dir = path.join(process.cwd(), "public", "products");
  const files = fs.readdirSync(dir).filter((f) =>
    /\.(jpe?g|png|webp)$/i.test(f)
  );
  const urls = files.map((f) => `/products/${f}`);
  return NextResponse.json(urls);
}
