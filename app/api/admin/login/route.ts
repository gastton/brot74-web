import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, signToken } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimit";

const LOGIN_RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const rateLimitKey = `admin-login:${getClientIp(req)}`;
  const { allowed, resetAt } = checkRateLimit(rateLimitKey, LOGIN_RATE_LIMIT);

  if (!allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((resetAt - Date.now()) / 1000)
    );
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      }
    );
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
