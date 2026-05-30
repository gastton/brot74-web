import MercadoPago from "mercadopago";

let mpClient: MercadoPago | null = null;

export function getMPClient(): MercadoPago {
  if (!mpClient) {
    if (!process.env.MP_ACCESS_TOKEN) {
      throw new Error("MP_ACCESS_TOKEN no configurado");
    }
    mpClient = new MercadoPago({ accessToken: process.env.MP_ACCESS_TOKEN });
  }
  return mpClient;
}

export function isMPConfigured(): boolean {
  return !!(process.env.MP_ACCESS_TOKEN && process.env.MP_PUBLIC_KEY);
}
