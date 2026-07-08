import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { put } from "@vercel/blob";
import sharp from "sharp";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const HEIC_EXTENSIONS = ["heic", "heif"];
const ALLOWED_FOLDERS = ["products", "dates"] as const;
type UploadFolder = (typeof ALLOWED_FOLDERS)[number];
const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 1200;
const TARGET_BYTES = 150 * 1024; // 150KB, con margen bajo el límite de 200KB del ticket
const QUALITY_STEPS = [75, 65, 55, 45, 35];

async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  const pipeline = sharp(buffer)
    .rotate() // respeta la orientación EXIF de fotos sacadas con el celular
    .resize({ width: MAX_WIDTH, withoutEnlargement: true });

  let result: Buffer | null = null;
  for (const quality of QUALITY_STEPS) {
    result = await pipeline.clone().webp({ quality }).toBuffer();
    if (result.byteLength <= TARGET_BYTES) return result;
  }
  return result!;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folderInput = formData.get("folder");
  const folder: UploadFolder = ALLOWED_FOLDERS.includes(folderInput as UploadFolder)
    ? (folderInput as UploadFolder)
    : "products";

  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (HEIC_EXTENSIONS.includes(ext) || ["image/heic", "image/heif"].includes(file.type)) {
    return NextResponse.json(
      { error: "Formato HEIC/HEIF no soportado. Convertí la foto a JPG, PNG o WEBP antes de subirla." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Formato no permitido. Usá JPG, PNG o WEBP." }, { status: 400 });
  }

  if (file.size > MAX_ORIGINAL_BYTES) {
    return NextResponse.json(
      { error: `El archivo pesa demasiado. El límite es ${MAX_ORIGINAL_BYTES / (1024 * 1024)}MB.` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let optimized: Buffer;
  try {
    optimized = await optimizeImage(buffer);
  } catch (err) {
    console.error("Error optimizando imagen", err);
    return NextResponse.json({ error: "El archivo está dañado o no es una imagen válida." }, { status: 400 });
  }

  const filename = `${folder}/${folder === "dates" ? "date" : "product"}-${Date.now()}.webp`;

  try {
    const blob = await put(filename, optimized, { access: "public", contentType: "image/webp" });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("Error subiendo a Vercel Blob", err);
    return NextResponse.json({ error: "No se pudo subir la imagen. Probá de nuevo." }, { status: 500 });
  }
}
