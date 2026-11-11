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
