"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CalendarIcon, PinIcon, TruckIcon } from "@/components/FlowIcons";
import { parseOrderReturn, readOrderReturnRaw } from "@/lib/orderReturn";
import { formatCurrency } from "@/lib/utils";
import BankDetails from "@/components/BankDetails";

// BRT-262/263: a la vuelta de Mercado Pago (?pago=mp) se consulta el estado
// del pago (BRT-257). El cliente suele volver antes que el aviso de MP, así
// que mientras siga pendiente se reintenta unas veces antes de mostrar "procesando".
// unpaid = MP dice que no hubo pago (volvió sin pagar o se lo rechazaron);
// error = no se pudo consultar (sin conexión); unknown = no hay token en este navegador.
// transfer = el cliente eligió pagar por transferencia al alias (se confirma a mano).
type MpState = "checking" | "approved" | "pending" | "unpaid" | "transfer" | "rejected" | "error" | "unknown";
const POLL_INTERVAL_MS = 2500;
const POLL_ATTEMPTS = 6;
/** Una consulta colgada no deja la pantalla trabada: se corta y cuenta como fallida. */
const REQUEST_TIMEOUT_MS = 10_000;

const noopSubscribe = () => () => {};

/** false en el servidor y en la hidratación; true después, ya en el navegador. */
function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function useMpPaymentState(
  orderId: string | null,
  enabled: boolean,
  token: string | null
): { state: MpState; total: number | null; checkAgain: () => void; markTransfer: (total: number) => void } {
  const hydrated = useHydrated();
  // round: cada "Consultar de nuevo" vuelve a arrancar las consultas.
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ token: string; round: number; state: MpState; total?: number } | null>(null);

  useEffect(() => {
    if (!enabled || !orderId || !token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check(attempt: number) {
      let status: string | null = null;
      let total: number | undefined;
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId!)}/payment-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (res.ok) {
          const data = await res.json();
          status = data.status ?? null;
          if (typeof data.total === "number") total = data.total;
        }
      } catch {
        /* sin conexión o timeout: se reintenta */
      }
      if (cancelled) return;
      if (status === "approved" || status === "rejected") return setResult({ token: token!, round, state: status });
      if (status === "transfer") return setResult({ token: token!, round, state: "transfer", total });
      // Sin pago en MP: se confirma con una segunda consulta (por si el pago recién se acredita) y se muestra.
      if (status === "unpaid" && attempt >= 1) return setResult({ token: token!, round, state: "unpaid" });
      if (attempt + 1 >= POLL_ATTEMPTS) {
        return setResult({ token: token!, round, state: status === "pending" ? "pending" : "error" });
      }
      timer = setTimeout(() => void check(attempt + 1), POLL_INTERVAL_MS);
    }

    void check(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, orderId, token, round]);

  const checkAgain = () => setRound((r) => r + 1);
  const markTransfer = (total: number) => token && setResult({ token, round, state: "transfer", total });
  const base = { total: null, checkAgain, markTransfer };
  if (!enabled) return { ...base, state: "unknown" };
  // Hasta leer el navegador no se sabe si hay token: se muestra "confirmando" (igual en servidor y cliente).
  if (!hydrated) return { ...base, state: "checking" };
  if (!token) return { ...base, state: "unknown" };
  const current = result?.token === token && result.round === round ? result : null;
  return { ...base, state: current?.state ?? "checking", total: current?.total ?? null };
}

function InfoRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className="flex items-center gap-2" style={{ padding: "14px 0", borderBottom: last ? "none" : "1px solid rgba(14,35,60,.10)" }}>
      <span className="flex-none flex">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>{label}</div>
        <div className="text-[16px] leading-[1.25] text-navy break-words">{value}</div>
      </div>
    </div>
  );
}

/** Vuelve a pedir el link de pago (el mismo mientras no venza) y sale a MP. */
function RetryMpButton({ orderId, token, primary }: { orderId: string; token: string; primary: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function retry() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/mercadopago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.checkoutUrl === "string") {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(data.error ?? "No pudimos abrir el pago. Probá de nuevo.");
    } catch {
      setError("Error de conexión. Probá de nuevo.");
    }
    setLoading(false);
  }

  return (
    <div className="mb-3">
      <button type="button" onClick={retry} disabled={loading} className={primary ? "brot-pill" : "brot-pill brot-pill--ghost"}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ir a pagar con Mercado Pago"}
      </button>
      {error && <div className="text-center text-[13px] mt-[10px]" style={{ color: "#C0392B" }}>{error}</div>}
    </div>
  );
}

/** "¿No te alcanzó el saldo?": pasa el pedido a transferencia al alias (sin vencimiento). */
function SwitchToTransferButton({ orderId, token, onDone }: { orderId: string; token: string; onDone: (total: number) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function switchToTransfer() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.total === "number") {
        onDone(data.total);
        return;
      }
      setError(data.error ?? "No pudimos cambiar el pago. Probá de nuevo.");
    } catch {
      setError("Error de conexión. Probá de nuevo.");
    }
    setLoading(false);
  }

  return (
    <div className="mt-[10px]">
      <button type="button" onClick={switchToTransfer} disabled={loading} className="brot-pill brot-pill--ghost">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "¿No te alcanzó el saldo? Pagá por transferencia"}
      </button>
      {error && <div className="text-center text-[13px] mt-[10px]" style={{ color: "#C0392B" }}>{error}</div>}
    </div>
  );
}

function ConfirmacionContent() {
  const params  = useSearchParams();
  const orderId = params.get("order");
  const isMp    = params.get("pago") === "mp";

  // MP vuelve solo con el número de pedido: token y datos de retiro quedaron
  // guardados en este navegador antes de salir (lib/orderReturn.ts).
  // Se lee con useSyncExternalStore: en el servidor no hay localStorage y así no hay diferencia al hidratar.
  const savedRaw = useSyncExternalStore(
    noopSubscribe,
    () => (isMp && orderId ? readOrderReturnRaw(orderId) : null),
    () => null
  );
  const saved = useMemo(() => parseOrderReturn(savedRaw), [savedRaw]);
  const savedParams = new URLSearchParams(saved?.confirmationQuery ?? "");
  const pickup  = params.get("pickup") ?? savedParams.get("pickup");
  const place   = params.get("place") ?? savedParams.get("place");
  const isDelivery = (params.get("mode") ?? savedParams.get("mode")) === "delivery";

  const { state: mpState, total, checkAgain, markTransfer } = useMpPaymentState(orderId, isMp, saved?.token ?? null);
  const showDetails =
    !isMp || mpState === "approved" || mpState === "pending" || mpState === "transfer" || mpState === "error" || mpState === "unknown";

  let heading: React.ReactNode = <>Ya pediste<br />tu <span style={{ color: "#C8851A" }}>BROT</span></>;
  let message = "Cuando se acredite la transferencia, te confirmamos por WhatsApp.";
  if (isMp) {
    if (mpState === "checking") {
      heading = <>Confirmando<br />tu <span style={{ color: "#C8851A" }}>pago</span></>;
      message = "Un segundo, estamos consultando a Mercado Pago.";
    } else if (mpState === "approved") {
      heading = <>Pago<br /><span style={{ color: "#C8851A" }}>confirmado</span></>;
      message = "Recibimos tu pago y tu pedido ya está confirmado. ¡Gracias!";
    } else if (mpState === "pending") {
      heading = <>Tu pago se está<br /><span style={{ color: "#C8851A" }}>procesando</span></>;
      message = "Si ya pagaste, en unos minutos se acredita y te confirmamos por WhatsApp. Si no llegaste a pagar, podés hacerlo ahora; el pedido se cancela solo si no se paga a tiempo.";
    } else if (mpState === "unpaid") {
      heading = <>Todavía no<br /><span style={{ color: "#C8851A" }}>pagaste</span></>;
      message = "Tu pedido está reservado, pero el pago en Mercado Pago no se completó.";
    } else if (mpState === "transfer") {
      heading = <>Pagá por<br /><span style={{ color: "#C8851A" }}>transferencia</span></>;
      message = "Tu pedido está reservado. Transferí el total al alias y, cuando llegue, te confirmamos por WhatsApp.";
    } else if (mpState === "error") {
      heading = <>No pudimos ver<br />tu <span style={{ color: "#C8851A" }}>pago</span></>;
      message = "Parece que hay un problema de conexión. Si pagaste, no te preocupes: te confirmamos por WhatsApp cuando se acredite.";
    } else if (mpState === "rejected") {
      heading = <>El pago no<br />se <span style={{ color: "#C8851A" }}>completó</span></>;
      message = "Pasó el tiempo para pagar y el pedido se canceló. Podés hacer un pedido nuevo cuando quieras.";
    } else {
      message = "Si pagaste con Mercado Pago, te confirmamos por WhatsApp cuando se acredite.";
    }
  }

  // v45 editorial: sin tarjeta, composición a la izquierda y el CTA anclado
  // abajo; v48: sin el filete suelto de arriba.
  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-[480px] px-5 pt-[18px] pb-[30px] flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col justify-center py-10">
          {/* Sello — mismo logo que el footer de la landing */}
          <Image
            src="/assets/logo-sello-mono-navy-transparente.png"
            alt="BROT 74"
            width={2400}
            height={2400}
            priority
            style={{ width: "96px", height: "auto", display: "block" }}
          />

          {/* "Pago confirmado" lleva un sello verde para que no se confunda con "Todavía no pagaste". */}
          {isMp && mpState === "approved" && (
            <div
              className="inline-flex items-center gap-2 self-start mt-[22px]"
              style={{ background: "#E6F2EA", color: "#1F6B3A", borderRadius: "999px", padding: "6px 14px 6px 8px", fontSize: "14px", fontWeight: 600 }}
            >
              <span
                className="flex items-center justify-center"
                style={{ width: "22px", height: "22px", borderRadius: "999px", background: "#1F6B3A" }}
                aria-hidden="true"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
              Pago acreditado
            </div>
          )}

          {orderId && (
            <div className="brot-mlabel brot-mlabel-amber mt-[22px]" style={{ fontWeight: 500 }}>
              Pedido #{orderId}
            </div>
          )}

          <h1 className="brot-h mt-[10px]" style={{ fontSize: "44px" }}>
            {heading}
          </h1>

          <p className="text-[16px] leading-[1.5] text-stone mt-[14px] mb-0" style={{ maxWidth: "34ch" }}>
            {message}
          </p>

          {/* "Todavía no pagaste": aviso destacado y el botón para pagar ahí mismo, sin los datos de retiro. */}
          {isMp && mpState === "unpaid" && (
            <div className="mt-[20px]">
              <div
                style={{ background: "#FBF1DF", borderLeft: "3px solid #C8851A", padding: "14px 16px", color: "#5C3D08", fontSize: "15px", lineHeight: 1.45 }}
              >
                <div style={{ fontWeight: 600, marginBottom: "2px" }}>Falta el pago</div>
                Pagalo ahora con Mercado Pago. Si no se paga a tiempo, el pedido se cancela solo.
              </div>
              {orderId && saved && (
                <div className="mt-[16px]">
                  <RetryMpButton orderId={orderId} token={saved.token} primary />
                  <SwitchToTransferButton orderId={orderId} token={saved.token} onDone={markTransfer} />
                </div>
              )}
            </div>
          )}

          {/* Pagar por transferencia: total y datos del alias, como en el checkout. */}
          {isMp && mpState === "transfer" && (
            <div className="mt-[20px]">
              {total != null && (
                <div style={{ padding: "4px 0 16px", borderBottom: "1px solid #0E233C" }}>
                  <div className="brot-mlabel" style={{ fontWeight: 500 }}>Total a transferir</div>
                  <div className="leading-none mt-[8px]" style={{ fontSize: "44px", fontWeight: 500, letterSpacing: "-.03em", color: "#C8851A", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(total)}
                  </div>
                </div>
              )}
              <div className="mt-[6px]">
                <BankDetails />
              </div>
            </div>
          )}

          {isMp && mpState === "checking" && (
            <Loader2 className="w-6 h-6 animate-spin mt-[18px]" style={{ color: "#C8851A" }} aria-label="Consultando el pago" />
          )}

          {showDetails && (pickup || place) && (
            <div className="mt-[18px]">
              {pickup && <InfoRow icon={<CalendarIcon />} label={isDelivery ? "Entrega" : "Retiro"} value={pickup} last={!place} />}
              {place && <InfoRow icon={isDelivery ? <TruckIcon /> : <PinIcon />} label={isDelivery ? "Dirección de entrega" : "Lugar"} value={place} last />}
            </div>
          )}
        </div>

        {isMp && mpState === "pending" && orderId && saved && (
          <RetryMpButton orderId={orderId} token={saved.token} primary={false} />
        )}

        {isMp && mpState === "error" && (
          <button type="button" onClick={checkAgain} className="brot-pill brot-pill--ghost mb-3">
            Consultar de nuevo
          </button>
        )}

        {/* Transferencia: "Ya transferí" cierra como en el checkout (confirmación de siempre, sin ?pago=mp). */}
        {isMp && mpState === "transfer" && orderId && (
          <Link
            href={`/confirmacion?order=${encodeURIComponent(orderId)}&status=pending${saved?.confirmationQuery ?? ""}`}
            className="brot-pill no-underline mb-3"
          >
            Ya transferí
          </Link>
        )}

        <Link
          href="/"
          className={isMp && (mpState === "unpaid" || mpState === "transfer") ? "brot-pill brot-pill--ghost no-underline" : "brot-pill no-underline"}
        >
          {isMp && mpState === "rejected" ? "Hacer un pedido nuevo" : "Volver al inicio"}
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense>
      <ConfirmacionContent />
    </Suspense>
  );
}
