import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

function requiredEnv(name: "JWT_SECRET" | "ADMIN_PASSWORD"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. No hay un valor por defecto: hay que definirla explícitamente.`
    );
  }
  return value;
}

function getSecret() {
  return new TextEncoder().encode(requiredEnv("JWT_SECRET"));
}

export async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function checkAdminPassword(password: string): boolean {
  return password === requiredEnv("ADMIN_PASSWORD");
}
