/**
 * Rate limiter en memoria, best-effort. Pensado para endpoints de bajo
 * tráfico (login del admin, creación de pedidos, lista de espera) donde
 * alcanza con un freno básico contra fuerza bruta y abuso.
 *
 * Limitación conocida: el estado vive en memoria del proceso, así que no es
 * consistente entre instancias serverless concurrentes ni sobrevive a un
 * redeploy/cold start. Para algo más estricto hace falta un store
 * compartido (Redis, Vercel KV, etc.) — no vale la pena la complejidad para
 * el volumen de tráfico actual de este proyecto.
 */

import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Barrido periódico de entradas vencidas para que el Map no crezca sin
// límite (ej. muchas IPs distintas pegándole al endpoint). No hace falta
// un timer de background: alcanza con revisar cada tanto en el propio
// camino de checkRateLimit.
const SWEEP_INTERVAL_CALLS = 100;
let callsSinceSweep = 0;

function sweepExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();

  callsSinceSweep += 1;
  if (callsSinceSweep >= SWEEP_INTERVAL_CALLS) {
    callsSinceSweep = 0;
    sweepExpired(now);
  }

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt };
  }

  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: max - bucket.count,
    resetAt: bucket.resetAt,
  };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

// Para los tests: el estado vive en memoria del proceso, así que sin esto un
// test heredaría el contador del anterior.
export function resetAllRateLimits(): void {
  buckets.clear();
  callsSinceSweep = 0;
}

// IP del cliente según los headers del proxy (en Vercel, x-forwarded-for lo
// pone la plataforma).
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Respuesta 429 estándar con Retry-After.
export function tooManyRequestsResponse(resetAt: number, message: string): NextResponse {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
