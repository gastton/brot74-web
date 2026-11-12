"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CalendarIcon, PinIcon, TruckIcon } from "@/components/FlowIcons";
import { parseOrderReturn, readOrderReturnRaw } from "@/lib/orderReturn";

// BRT-262/263: a la vuelta de Mercado Pago (?pago=mp) se consulta el estado
// del pago (BRT-257). El cliente suele volver antes que el aviso de MP, así
// que mientras siga pendiente se reintenta unas veces antes de mostrar "procesando".
type MpState = "checking" | "approved" | "pending" | "rejected" | "unknown";
const POLL_INTERVAL_MS = 2500;
const POLL_ATTEMPTS = 6;

const noopSubscribe = () => () => {};

/** false en el servidor y en la hidratación; true después, ya en el navegador. */
function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function useMpPaymentState(orderId: string | null, enabled: boolean, token: string | null): MpState {
  const hydrated = useHydrated();
  const [result, setResult] = useState<{ token: string; state: MpState } | null>(null);

  useEffect(() => {
    if (!enabled || !orderId || !token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check(attempt: number) {
      let status: string | null = null;
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId!)}/payment-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.ok) status = (await res.json()).status ?? null;
      } catch {
        /* sin conexión: se reintenta */
      }
      if (cancelled) return;
      if (status === "approved" || status === "rejected") return setResult({ token: token!, state: status });
      if (attempt + 1 >= POLL_ATTEMPTS) {
        return setResult({ token: token!, state: status === "pending" ? "pending" : "unknown" });
      }
      timer = setTimeout(() => check(attempt + 1), POLL_INTERVAL_MS);
    }

    check(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, orderId, token]);

  if (!enabled) return "unknown";
  // Hasta leer el navegador no se sabe si hay token: se muestra "confirmando" (igual en servidor y cliente).
  if (!hydrated) return "checking";
  if (!token) return "unknown";
  return result?.token === token ? result.state : "checking";
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
function RetryMpButton({ orderId, token }: { orderId: string; token: string }) {
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
      <button type="button" onClick={retry} disabled={loading} className="brot-pill brot-pill--ghost">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ir a pagar con Mercado Pago"}
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

  const mpState = useMpPaymentState(orderId, isMp, saved?.token ?? null);
  const showDetails = !isMp || mpState === "approved" || mpState === "pending" || mpState === "unknown";

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
          <RetryMpButton orderId={orderId} token={saved.token} />
        )}

        <Link href="/" className="brot-pill no-underline">
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
