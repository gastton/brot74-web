import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, signToken } from "@/lib/auth";
import { checkRateLimit, resetRateLimit, getClientIp, tooManyRequestsResponse } from "@/lib/rateLimit";

const LOGIN_RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const rateLimitKey = `admin-login:${getClientIp(req)}`;
  const { allowed, resetAt } = checkRateLimit(rateLimitKey, LOGIN_RATE_LIMIT);

  if (!allowed) {
    return tooManyRequestsResponse(resetAt, "Demasiados intentos. Probá de nuevo más tarde.");
  }

  const { password } = await req.json();

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  resetRateLimit(rateLimitKey);

  const token = await signToken({ role: "admin" });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return res;
}
