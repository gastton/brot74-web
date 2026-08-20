import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { verifyToken } from "@/lib/auth";

const CORRECT_PASSWORD = process.env.ADMIN_PASSWORD as string;

function loginRequest(password: string) {
  return new NextRequest("http://localhost/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

describe("POST /api/admin/login", () => {
  it("devuelve 401 con contraseña incorrecta y no setea cookie", async () => {
    const res = await login(loginRequest("contraseña-incorrecta-obviamente"));

    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("devuelve 200 y setea una cookie admin_token válida con la contraseña correcta", async () => {
    const res = await login(loginRequest(CORRECT_PASSWORD));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("admin_token=");
    expect(setCookie).toContain("HttpOnly");

    const token = res.cookies.get("admin_token")?.value ?? "";
    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
  });
});

describe("POST /api/admin/logout", () => {
  it("limpia la cookie admin_token", async () => {
    const res = await logout();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("admin_token=");
    expect(setCookie).toMatch(/Max-Age=0/i);
  });
});
