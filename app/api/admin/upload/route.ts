import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { put } from "@vercel/blob";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Formato no permitido. Usá JPG, PNG o WEBP." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    // Fuerza la decodificación completa de los píxeles para detectar archivos dañados,
    // ya que leer solo los metadatos no alcanza a detectar un JPEG truncado o corrupto.
    await sharp(buffer).stats();
  } catch {
    return NextResponse.json({ error: "El archivo está dañado o no es una imagen válida." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `products/product-${Date.now()}.${ext}`;

  try {
    const blob = await put(filename, buffer, { access: "public", contentType: file.type });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("Error subiendo a Vercel Blob", err);
    return NextResponse.json({ error: "No se pudo subir la imagen. Probá de nuevo." }, { status: 500 });
  }
}
