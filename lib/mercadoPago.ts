// BRT-249: credenciales de Mercado Pago (Checkout Pro, API de Orders).
//
// Se leen de variables de entorno: `.env.local` en dev y Vercel en prod. No
// hay valores por defecto (mismo criterio que lib/auth.ts). La lectura es
// perezosa: si faltan, falla recién cuando se usa MP, así la app sigue andando
// con el toggle mpCheckout apagado y sin las variables cargadas.
//
// - MP_ACCESS_TOKEN: Access Token de la aplicación ("APP_USR-…"). En dev es el
//   de la cuenta vendedora de prueba; MP no acepta credenciales "TEST-" en la
//   API de Orders. Solo se usa en el servidor: nunca va en una variable
//   NEXT_PUBLIC_ ni al navegador.
// - MP_WEBHOOK_SECRET: "Firma secreta" de Webhooks en el panel de la
//   aplicación, para validar el header x-signature de los avisos.
//
// No hace falta Public Key: con Checkout Pro el cliente paga en el sitio de
// MP (checkout_url de la orden) y no hay SDK de MP en el frontend.

type MercadoPagoEnv = "MP_ACCESS_TOKEN" | "MP_WEBHOOK_SECRET";

function requiredEnv(name: MercadoPagoEnv): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. No hay un valor por defecto: hay que definirla explícitamente.`
    );
  }
  return value;
}

export const MP_API_URL = "https://api.mercadopago.com";

export function mpAccessToken(): string {
  return requiredEnv("MP_ACCESS_TOKEN");
}

export function mpWebhookSecret(): string {
  return requiredEnv("MP_WEBHOOK_SECRET");
}

// ── BRT-251: orden de Checkout Pro (link de pago) ─────────────────────────

/**
 * Tipos de medio de pago que se excluyen: queda solo el dinero en cuenta de
 * MP (que no se puede excluir). Sin tarjetas por los contracargos y sin
 * efectivo (Pago Fácil/Rapipago). Son los tipos activos en Argentina según
 * GET /v1/payment_methods.
 */
export const MP_NOT_ALLOWED_PAYMENT_TYPES = ["credit_card", "debit_card", "prepaid_card", "ticket"] as const;

/** Cuánto dura el link de pago. Pasado esto, BRT-256 cancela el pedido y libera el stock. */
export const MP_PAYMENT_TTL_MINUTES = 30;

export class MercadoPagoError extends Error {
  constructor(public status: number, public body: string) {
    super(`Mercado Pago respondió ${status}`);
  }
}

export interface CheckoutOrderInput {
  orderId: number;
  /** Mismo valor en reintentos: MP devuelve la misma orden en vez de crear otra. */
  idempotencyKey: string;
  total: number;
  items: { title: string; quantity: number; unitPrice: number }[];
  /** URL a la que vuelve el cliente desde MP (aprobado, pendiente o rechazado). */
  returnUrl: string;
}

export interface CheckoutOrder {
  id: string;
  checkoutUrl: string;
}

/** Pesos enteros → string con dos decimales, el formato de montos de la API de Orders. */
function mpAmount(pesos: number): string {
  return pesos.toFixed(2);
}

async function mpFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${MP_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${mpAccessToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new MercadoPagoError(res.status, text);
  return JSON.parse(text);
}

function toCheckoutOrder(data: unknown): CheckoutOrder {
  const { id, checkout_url } = (data ?? {}) as { id?: unknown; checkout_url?: unknown };
  if (typeof id !== "string" || typeof checkout_url !== "string") {
    throw new MercadoPagoError(200, "Respuesta sin id o checkout_url");
  }
  return { id, checkoutUrl: checkout_url };
}

/**
 * Crea la orden de Checkout Pro (API de Orders) para un pedido. Solo dinero
 * en cuenta, con external_reference = ID del pedido y vencimiento de
 * MP_PAYMENT_TTL_MINUTES. El aviso de pago llega al webhook configurado en el
 * panel de la aplicación (la API de Orders no lleva notification_url).
 */
export async function createCheckoutOrder(input: CheckoutOrderInput): Promise<CheckoutOrder> {
  // MP exige que total_amount sea la suma de los ítems. Los precios del
  // pedido ya vienen con descuento aplicado, pero si por algo no cierra se
  // manda una sola línea con el total en vez de un monto distinto.
  const itemsSum = input.items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
  const items =
    itemsSum === input.total
      ? input.items
      : [{ title: `BROT 74 · Pedido #${input.orderId}`, quantity: 1, unitPrice: input.total }];

  const data = await mpFetch("/v1/orders", {
    method: "POST",
    headers: { "X-Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      type: "online",
      processing_mode: "manual",
      external_reference: String(input.orderId),
      total_amount: mpAmount(input.total),
      expiration_time: `PT${MP_PAYMENT_TTL_MINUTES}M`,
      items: items.map((i) => ({ title: i.title, quantity: i.quantity, unit_price: mpAmount(i.unitPrice) })),
      config: {
        online: {
          success_url: input.returnUrl,
          pending_url: input.returnUrl,
          failure_url: input.returnUrl,
          auto_return: "approved",
        },
        payment_method: { not_allowed_types: MP_NOT_ALLOWED_PAYMENT_TYPES },
      },
    }),
  });
  return toCheckoutOrder(data);
}

function orderPath(mpOrderId: string): string {
  return `/v1/orders/${encodeURIComponent(mpOrderId)}`;
}

/** Orden ya creada (para volver a dar el mismo link si el cliente reintenta). */
export async function getCheckoutOrder(mpOrderId: string): Promise<CheckoutOrder> {
  return toCheckoutOrder(await mpFetch(orderPath(mpOrderId)));
}

// ── BRT-253: estado de pago de la orden ───────────────────────────────────

/** Lo que importa de la orden para confirmar un pedido. Los montos de MP son strings ("800.00"). */
export interface MpOrderPayment {
  id: string;
  status: string;
  statusDetail: string;
  externalReference: string | null;
  totalPaidAmount: string | null;
  payments: { id: string; status: string; paymentType: string | null }[];
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Estado de una orden consultado directo a MP. El webhook no le cree al aviso:
 * con el ID que llega, se pregunta acá si la orden está pagada y por cuánto.
 */
export async function getOrderPayment(mpOrderId: string): Promise<MpOrderPayment> {
  const data = ((await mpFetch(orderPath(mpOrderId))) ?? {}) as Record<string, unknown>;
  const id = str(data.id);
  const status = str(data.status);
  const statusDetail = str(data.status_detail);
  // Sin estado no se puede decidir: error (el webhook responde 500 y MP
  // reintenta) en vez de tomarlo como "no pagado" y perder el aviso.
  if (!id || !status || !statusDetail) throw new MercadoPagoError(200, "Respuesta sin id o estado");
  const transactions = (data.transactions ?? {}) as { payments?: unknown };
  const payments = Array.isArray(transactions.payments) ? transactions.payments : [];
  return {
    id,
    status,
    statusDetail,
    externalReference: str(data.external_reference),
    totalPaidAmount: str(data.total_paid_amount),
    payments: payments.flatMap((p) => {
      const { id: paymentId, status, payment_method } = (p ?? {}) as Record<string, unknown>;
      if (typeof paymentId !== "string") return [];
      const method = (payment_method ?? {}) as { type?: unknown };
      return [{ id: paymentId, status: str(status) ?? "", paymentType: str(method.type) }];
    }),
  };
}
