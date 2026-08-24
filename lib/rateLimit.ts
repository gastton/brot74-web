/**
 * Rate limiter en memoria, best-effort. Pensado para endpoints de bajo
 * tráfico (ej. login del admin) donde alcanza con un freno básico contra
 * fuerza bruta.
 *
 * Limitación conocida: el estado vive en memoria del proceso, así que no es
 * consistente entre instancias serverless concurrentes ni sobrevive a un
 * redeploy/cold start. Para algo más estricto hace falta un store
 * compartido (Redis, Vercel KV, etc.) — no vale la pena la complejidad para
 * el volumen de tráfico actual de este proyecto.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

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
