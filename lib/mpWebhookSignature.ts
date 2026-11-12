import { createHmac, timingSafeEqual } from "node:crypto";

// BRT-253: firma de los avisos (webhooks) de Mercado Pago.
//
// MP firma cada aviso con la "Firma secreta" del panel. El header es
// `x-signature: ts=<ts>,v1=<hmac>` y el HMAC-SHA256 (hex) se calcula sobre:
//
//   id:<data.id de la query>;request-id:<header x-request-id>;ts:<ts>;
//
// Si falta data.id o x-request-id, esa parte se saca del texto (así lo indica
// la documentación y así lo hacen los SDK oficiales).
//
// Mayúsculas en data.id (los IDs de orden son "ORD01…"): la documentación dice
// pasarlo a minúsculas, pero los SDK oficiales lo dejaron de hacer en 2026-06
// porque MP firma con el ID tal cual llega. Se aceptan las dos formas: no baja
// la seguridad, porque las dos necesitan la firma secreta.

export interface WebhookSignatureInput {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}

function parseSignatureHeader(header: string): { ts: string; v1: string } | null {
  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "ts") ts = value;
    else if (key === "v1") v1 = value;
  }
  return ts && v1 ? { ts, v1 } : null;
}

function manifest(dataId: string | null, xRequestId: string | null, ts: string): string {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (xRequestId) parts.push(`request-id:${xRequestId}`);
  parts.push(`ts:${ts}`);
  return `${parts.join(";")};`;
}

function hexEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  // Un v1 que no es hex válido de 32 bytes no coincide nunca.
  return bufA.length === 32 && bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function isValidWebhookSignature({ xSignature, xRequestId, dataId, secret }: WebhookSignatureInput): boolean {
  if (!xSignature || !secret) return false;
  const parsed = parseSignatureHeader(xSignature);
  if (!parsed) return false;

  const ids = dataId ? [...new Set([dataId, dataId.toLowerCase()])] : [null];
  return ids.some((id) => {
    const expected = createHmac("sha256", secret).update(manifest(id, xRequestId, parsed.ts)).digest("hex");
    return hexEquals(expected, parsed.v1);
  });
}
