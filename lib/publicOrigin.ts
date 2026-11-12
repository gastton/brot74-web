// Origen público del sitio para armar URLs absolutas que salen afuera (la
// vuelta desde Mercado Pago, BRT-251/262).
//
// req.nextUrl.origin no alcanza detrás de un proxy en desarrollo: con ngrok el
// dev server ve "localhost:3000" y MP devolvía al cliente a su localhost en
// vez de a la URL de ngrok. Se usa el host con el que llegó el pedido
// (x-forwarded-host / host), pero solo si es uno de los nuestros: así nadie
// puede mandar un Host inventado y hacer que MP vuelva a otro sitio.
const ALLOWED_HOSTS = [
  /^(www\.)?brot74\.com$/,
  /^[a-z0-9-]+\.vercel\.app$/,
  /^[a-z0-9-]+\.ngrok-free\.(app|dev)$/,
  /^[a-z0-9-]+\.ngrok\.io$/,
];
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

function firstValue(header: string | null): string | null {
  const value = header?.split(",")[0]?.trim().toLowerCase();
  return value || null;
}

export function publicOrigin(req: { headers: Headers; nextUrl: { origin: string } }): string {
  const host = firstValue(req.headers.get("x-forwarded-host")) ?? firstValue(req.headers.get("host"));
  if (!host) return req.nextUrl.origin;
  const [hostname, port] = host.split(":");
  const isLocal = LOCAL_HOSTNAMES.has(hostname) && (port === undefined || /^\d+$/.test(port));
  const allowed = isLocal || (port === undefined && ALLOWED_HOSTS.some((re) => re.test(hostname)));
  if (!allowed) return req.nextUrl.origin;
  const forwardedProto = firstValue(req.headers.get("x-forwarded-proto"));
  const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : isLocal ? "http" : "https";
  return `${proto}://${host}`;
}
