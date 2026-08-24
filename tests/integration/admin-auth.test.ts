import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { verifyToken } from "@/lib/auth";

const CORRECT_PASSWORD = process.env.ADMIN_PASSWORD as string;

function loginRequest(password: string, ip?: string) {
  return new NextRequest("http://localhost/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
    headers: ip ? { "x-forwarded-for": ip } : undefined,
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

  it("bloquea con 429 tras 5 intentos fallidos desde la misma IP", async () => {
    const ip = "203.0.113.10";

    for (let i = 0; i < 5; i++) {
      const res = await login(loginRequest("contraseña-incorrecta", ip));
      expect(res.status).toBe(401);
    }

    const blocked = await login(loginRequest(CORRECT_PASSWORD, ip));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("resetea el contador de intentos tras un login exitoso", async () => {
    const ip = "203.0.113.20";

    // 4 de los 5 intentos permitidos, para probar el reset justo al límite.
    for (let i = 0; i < 4; i++) {
      await login(loginRequest("contraseña-incorrecta", ip));
    }

    const ok = await login(loginRequest(CORRECT_PASSWORD, ip));
    expect(ok.status).toBe(200);

    // Tras el reset, un intento fallido nuevo no debería estar ya al límite.
    const afterReset = await login(loginRequest("contraseña-incorrecta", ip));
    expect(afterReset.status).toBe(401);
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
