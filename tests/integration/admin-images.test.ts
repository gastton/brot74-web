import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("fs", () => ({
  default: { readdirSync: vi.fn() },
}));

import { GET } from "@/app/api/admin/images/route";
import fs from "fs";
import { adminCookieHeader } from "../helpers/auth";

function getRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/images", { headers });
}

describe("GET /api/admin/images", () => {
  it("devuelve 401 sin sesión de admin", async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it("devuelve solo archivos de imagen, mapeados a /products/<archivo>", async () => {
    vi.mocked(fs.readdirSync).mockReturnValue([
      "producto-1.jpg",
      "producto-2.PNG",
      "producto-3.webp",
      "notas.txt",
      ".DS_Store",
    ] as never);

    const res = await GET(getRequest(await adminCookieHeader()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(["/products/producto-1.jpg", "/products/producto-2.PNG", "/products/producto-3.webp"]);
  });
});
