import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

import { POST } from "@/app/api/admin/upload/route";
import { put } from "@vercel/blob";
import { adminCookieHeader } from "../helpers/auth";

// PNG 1x1 transparente válido
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

async function uploadRequest(
  file: File | null,
  extraHeaders: Record<string, string> = {},
  folder?: string
) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  if (folder) formData.append("folder", folder);
  return new NextRequest("http://localhost/api/admin/upload", {
    method: "POST",
    body: formData,
    headers: extraHeaders,
  });
}

describe("POST /api/admin/upload", () => {
  beforeEach(() => {
    vi.mocked(put).mockReset();
  });

  it("devuelve 401 sin sesión de admin", async () => {
    const file = new File([TINY_PNG], "foto.png", { type: "image/png" });
    const res = await POST(await uploadRequest(file));
    expect(res.status).toBe(401);
  });

  it("devuelve 400 si no se envía ningún archivo", async () => {
    const res = await POST(await uploadRequest(null, await adminCookieHeader()));
    expect(res.status).toBe(400);
  });

  it("devuelve 400 para archivos HEIC/HEIF", async () => {
    const file = new File([TINY_PNG], "foto.heic", { type: "image/heic" });
    const res = await POST(await uploadRequest(file, await adminCookieHeader()));
    expect(res.status).toBe(400);
  });

  it("devuelve 400 para un tipo de archivo no permitido", async () => {
    const file = new File([TINY_PNG], "foto.gif", { type: "image/gif" });
    const res = await POST(await uploadRequest(file, await adminCookieHeader()));
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si el archivo pesa más de 5MB", async () => {
    const big = Buffer.alloc(6 * 1024 * 1024);
    const file = new File([big], "foto.png", { type: "image/png" });
    const res = await POST(await uploadRequest(file, await adminCookieHeader()));
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si la imagen está corrupta", async () => {
    const garbage = Buffer.from("esto no es una imagen de verdad");
    const file = new File([garbage], "foto.jpg", { type: "image/jpeg" });
    const res = await POST(await uploadRequest(file, await adminCookieHeader()));
    expect(res.status).toBe(400);
  });

  it("optimiza y sube la imagen, devolviendo la URL del blob", async () => {
    vi.mocked(put).mockResolvedValue({ url: "https://blob.example/products/product-123.webp" } as never);

    const file = new File([TINY_PNG], "foto.png", { type: "image/png" });
    const res = await POST(await uploadRequest(file, await adminCookieHeader(), "products"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://blob.example/products/product-123.webp");

    const [filename, , options] = vi.mocked(put).mock.calls[0];
    expect(filename).toMatch(/^products\/product-\d+\.webp$/);
    expect(options).toMatchObject({ contentType: "image/webp" });
  });

  it("sin folder explícito, sube a products/ (compatibilidad)", async () => {
    vi.mocked(put).mockResolvedValue({ url: "https://blob.example/products/product-123.webp" } as never);

    const file = new File([TINY_PNG], "foto.png", { type: "image/png" });
    const res = await POST(await uploadRequest(file, await adminCookieHeader()));

    expect(res.status).toBe(200);
    const [filename] = vi.mocked(put).mock.calls[0];
    expect(filename).toMatch(/^products\/product-\d+\.webp$/);
  });

  it("con folder=dates, sube la imagen a la carpeta dates/", async () => {
    vi.mocked(put).mockResolvedValue({ url: "https://blob.example/dates/date-123.webp" } as never);

    const file = new File([TINY_PNG], "foto.png", { type: "image/png" });
    const res = await POST(await uploadRequest(file, await adminCookieHeader(), "dates"));

    expect(res.status).toBe(200);
    const [filename] = vi.mocked(put).mock.calls[0];
    expect(filename).toMatch(/^dates\/date-\d+\.webp$/);
  });

  it("con un folder no reconocido, cae de vuelta a products/", async () => {
    vi.mocked(put).mockResolvedValue({ url: "https://blob.example/products/product-123.webp" } as never);

    const file = new File([TINY_PNG], "foto.png", { type: "image/png" });
    const res = await POST(await uploadRequest(file, await adminCookieHeader(), "../../etc"));

    expect(res.status).toBe(200);
    const [filename] = vi.mocked(put).mock.calls[0];
    expect(filename).toMatch(/^products\/product-\d+\.webp$/);
  });
});
