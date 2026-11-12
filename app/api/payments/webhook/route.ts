import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoError, mpWebhookSecret } from "@/lib/mercadoPago";
import { confirmMpOrder } from "@/lib/mpPaymentConfirmation";
import { isValidWebhookSignature } from "@/lib/mpWebhookSignature";

// BRT-252: avisos de pago de Mercado Pago (webhook configurado en el panel de
// la aplicación, evento "Order (Mercado Pago)").
//
// - Público y sin límite por IP: lo llama MP, y cada aviso trae su firma.
// - Sin firma válida → 401 y no se hace nada (BRT-253).
// - El aviso es solo una señal: el estado y el monto se le consultan a MP
//   (lib/mpPaymentConfirmation.ts).
// - Responde 200 para todo lo procesado, se confirme o no, así MP no reintenta
//   algo que va a dar igual. Solo si MP no responde la consulta se devuelve
//   500, para que reintente más tarde.
// - No depende del toggle mpCheckout: si se apaga con links ya generados, esos
//   pagos se tienen que confirmar igual.

export async function POST(req: NextRequest) {
  const dataId = req.nextUrl.searchParams.get("data.id");
  const type = req.nextUrl.searchParams.get("type");

  const valid = isValidWebhookSignature({
    xSignature: req.headers.get("x-signature"),
    xRequestId: req.headers.get("x-request-id"),
    dataId,
    secret: mpWebhookSecret(),
  });
  if (!valid) {
    console.warn("Mercado Pago: aviso con firma inválida", { dataId, type });
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  if (type !== "order" || !dataId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await confirmMpOrder(dataId);
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch (e) {
    if (e instanceof MercadoPagoError && e.status === 404) {
      // Orden que no existe en esta cuenta (p. ej. el "Simular notificación" del panel): reintentar no sirve.
      console.warn("Mercado Pago: el aviso es de una orden que no existe", { dataId });
      return NextResponse.json({ ok: true, ignored: true });
    }
    if (e instanceof MercadoPagoError) {
      console.error("Mercado Pago: no se pudo consultar la orden del aviso", { dataId, status: e.status, body: e.body });
      return NextResponse.json({ error: "No se pudo consultar la orden" }, { status: 500 });
    }
    throw e;
  }
}
