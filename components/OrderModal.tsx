"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  stock: number | null; // available to new buyers at modal-open time
}

interface OrderModalProps {
  items: CartItem[];
  slotId: number;
  slotLabel: string;
  sessionToken: string;
  expiresAt: string;
  onRemoveItem: (productId: number) => void;
  onChangeQuantity: (productId: number, newQuantity: number) => void;
  onClose: (clearCart?: boolean) => void;
  onSuccess: (orderId: number) => void;
}

const MODAL_STYLE = {
  background: "#FBF7EF",
  borderRadius: "22px",
  boxShadow: "0 40px 80px -24px rgba(14,35,60,.6)",
} as const;

const HAIR = { height: "1px", background: "rgba(14,35,60,.10)" } as const;

const ctaTransition = "transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s";


function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18"/>
    </svg>
  );
}

function BagIcon({ stroke = "#F9F5EC" }: { stroke?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      <path d="M6.5 7l1 12.5h9l1-12.5"/><path d="M10 11v5M14 11v5"/>
    </svg>
  );
}

// Diálogo de aviso/confirmación propio (BRT-88): reemplaza a window.confirm/
// alert nativos, que no permiten personalizar el texto de los botones.
// Con un solo botón (sin cancelLabel) funciona como alerta ("OK"); con dos,
// como confirmación (cancelar / confirmar).
function ConfirmDialog({
  icon,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  icon: "clock" | "warning";
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ padding: "19px" }}>
      <div
        className="absolute inset-0"
        style={{ background: "rgba(14,35,60,.58)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
      />
      <div
        className="relative w-full text-center"
        style={{ ...MODAL_STYLE, maxWidth: "336px", padding: "26px 24px 22px" }}
      >
        <div
          className="mx-auto"
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(166,68,46,.12)",
            color: "#A6442E",
            marginBottom: "14px",
          }}
        >
          {icon === "clock" ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4.5"/><path d="M12 16h.01"/><circle cx="12" cy="12" r="9.2"/>
            </svg>
          )}
        </div>
        <p className="font-bold text-[15.5px] text-navy" style={{ lineHeight: 1.4, margin: 0 }}>
          {message}
        </p>
        <div className="flex" style={{ gap: "10px", marginTop: "20px" }}>
          {cancelLabel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 font-bold text-[14.5px]"
              style={{
                border: "1.5px solid rgba(14,35,60,.16)",
                background: "#fff",
                color: "#0E233C",
                borderRadius: "14px",
                padding: "13px 6px",
                cursor: "pointer",
                transition: ctaTransition,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 font-bold text-[14.5px]"
            style={{
              border: "none",
              background: "#0E233C",
              color: "#F9F5EC",
              borderRadius: "14px",
              padding: "13px 6px",
              cursor: "pointer",
              transition: ctaTransition,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 30px -16px rgba(14,35,60,.55)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function OrderModal({ items, slotId, slotLabel, sessionToken, expiresAt, onRemoveItem, onClose, onSuccess }: OrderModalProps) {
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [step, setStep]       = useState<"form" | "payment">("form");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );
  const [expired, setExpired] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [aliasCopied, setAliasCopied] = useState(false); // feedback transitorio del botón (1.4s)
  const [hasCopiedAlias, setHasCopiedAlias] = useState(false); // se mantiene: habilita "Ya pagué"
  const [toastVisible, setToastVisible] = useState(false);

  const orderDoneRef = useRef(false);
  const successScheduledRef = useRef(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const CVU     = process.env.NEXT_PUBLIC_CVU     ?? "";
  const ALIAS   = process.env.NEXT_PUBLIC_ALIAS   ?? "";
  const TITULAR = process.env.NEXT_PUBLIC_TITULAR ?? "";
  const CUIT    = process.env.NEXT_PUBLIC_CUIT    ?? "";

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Countdown timer — sigue corriendo en la pantalla de pago (no solo en el
  // form) para detectar la expiración en vivo y no depender de que el POST
  // a /api/orders falle recién cuando el usuario toca "Ya pagué". Al llegar
  // a 0 se muestra el diálogo de expiración (BRT-88) y se espera a que el
  // usuario toque "OK" — no se cierra solo.
  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(interval);
        setExpired(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Release reservation if user closes the tab/navigates away mid-checkout
  useEffect(() => {
    function handleBeforeUnload() {
      if (!orderDoneRef.current && sessionToken) {
        const blob = new Blob([JSON.stringify({ sessionToken })], { type: "application/json" });
        navigator.sendBeacon("/api/cart/release", blob);
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionToken]);

  // "Pagar": solo valida y pasa a la pantalla de transferencia — el pedido
  // todavía no existe en la DB, se crea recién cuando el usuario confirma
  // que ya pagó (ver handleYaPague).
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (expired) return; // el diálogo de expiración ya está cubriendo la pantalla
    if (!name.trim() || !phone.trim()) { setError("Nombre y teléfono son requeridos"); return; }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) { setError("El teléfono debe tener entre 8 y 15 dígitos"); return; }
    setStep("payment");
  }

  // Crea el pedido recién cuando el usuario confirma que ya pagó.
  // Si ya se creó (o se está creando) por un click anterior, no repite el POST.
  async function createOrder(): Promise<number | null> {
    if (expired) return null; // ya se detectó el vencimiento del lado del cliente
    if (orderId) return orderId;
    if (orderDoneRef.current) return null; // ya hay un POST en curso
    orderDoneRef.current = true;
    setLoading(true);
    setError("");
    try {
      const digits = phone.replace(/\D/g, "");
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: digits,
          deliverySlotId: slotId,
          sessionToken,
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        orderDoneRef.current = false;
        if (res.status === 409) {
          // Reserva vencida: mostramos el panel dedicado, no el cartel
          // genérico de error (que da a entender que falló el pago/alias).
          setExpired(true);
        } else {
          setError(data.error ?? "Error al procesar el pedido");
        }
        return null;
      }
      setOrderId(data.orderId);
      return data.orderId;
    } catch {
      orderDoneRef.current = false;
      setError("Error de conexión. Intentá de nuevo.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  const TOTAL_SECONDS = 15 * 60;
  const isUrgent = secondsLeft <= 120;
  const fillPct = ((secondsLeft / TOTAL_SECONDS) * 100).toFixed(2);

  // Botón X (BRT-88): si hay productos en el carrito, confirma antes de
  // cerrar — en cualquiera de los dos pasos. Si el diálogo de expiración ya
  // está cubriendo la pantalla, no hace falta preguntar dos veces.
  function handleCloseClick() {
    if (expired) { onClose(true); return; }
    if (items.length > 0) { setShowCloseConfirm(true); return; }
    onClose();
  }

  // Copia el alias — acción pasiva, no crea el pedido. El usuario se va
  // a pagar por su cuenta (app, home banking, lo que use) y vuelve.
  function handleCopyAlias() {
    navigator.clipboard?.writeText(ALIAS).catch(() => {});
    setAliasCopied(true);
    setHasCopiedAlias(true);
    setTimeout(() => setAliasCopied(false), 1400);
    setToastVisible(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 1600);
  }

  // "Ya pagué": único gesto real de que el usuario transfirió — recién acá
  // se crea el pedido y se avisa por WhatsApp.
  async function handleYaPague() {
    const newOrderId = await createOrder();
    if (newOrderId != null && !successScheduledRef.current) {
      successScheduledRef.current = true;
      setTimeout(() => onSuccess(newOrderId), 1000);
    }
  }

  return (
    <div className="brot-co-backdrop fixed inset-0 z-50 flex justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(14,35,60,.58)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
        onClick={() => onClose()}
      />

      {/* Modal — hoja de pantalla completa en mobile, un solo scroll natural
         (BRT-89: antes había scroll anidado triple acá). En 900px+ vuelve a
         ser la tarjeta centrada de siempre (ver globals.css). */}
      <div
        className="brot-co-modal relative w-full overflow-y-auto"
        style={MODAL_STYLE}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-[14px]"
          style={step === "payment" ? { padding: "24px 26px 18px" } : { padding: "26px 22px 12px" }}
        >
          <div>
            <h3
              className="text-navy m-0"
              style={
                step === "payment"
                  ? { fontWeight: 700, fontSize: "27px", letterSpacing: "-.01em" }
                  : { fontWeight: 800, fontSize: "28px", letterSpacing: "-.015em", lineHeight: 1.05 }
              }
            >
              {step === "payment" ? "Pagá por transferencia" : "Tu pedido"}
            </h3>
            {(step === "payment" || items.length > 0) && (
              <div
                className="text-[14.5px] text-stone flex items-center gap-[7px]"
                style={{ fontStyle: "italic", marginTop: "6px", whiteSpace: "nowrap" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto", opacity: 0.75 }}>
                  <rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>
                </svg>
                {slotLabel}
              </div>
            )}
          </div>
          <button
            onClick={handleCloseClick}
            aria-label="Cerrar"
            className="flex-none mt-0.5 flex items-center justify-center border-none bg-transparent p-0"
            style={{ cursor: "pointer", transition: "transform .15s, opacity .15s", opacity: step === "payment" ? 1 : 0.6 }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.opacity = step === "payment" ? "1" : "0.6"; }}
          >
            <CloseIcon />
          </button>
        </div>

        <div style={HAIR} />

        {/* ── Pantalla de pago (step = payment) ── */}
        {step === "payment" ? (
          <div className="brot-cf-body px-[26px] py-[24px] space-y-[22px]">
            {/* Total */}
            <div className="brot-cf-tot text-center">
              <div className="font-semibold text-[14.5px] text-stone">Total a transferir</div>
              <div className="brot-cf-tot-amount font-bold leading-none mt-[6px]" style={{ fontSize: "46px", letterSpacing: "-.02em", color: "#C8851A" }}>
                {formatCurrency(total)}
              </div>
            </div>

            {/* Datos bancarios */}
            <div
              className="brot-cf-data overflow-hidden"
              style={{ background: "#fff", border: "1px solid rgba(14,35,60,.08)", borderRadius: "14px", boxShadow: "0 14px 26px -20px rgba(14,35,60,.4)" }}
            >
              {TITULAR && (
                <div className="flex items-center gap-[10px] px-[14px] py-[9px]" style={{ borderBottom: "1px solid rgba(14,35,60,.08)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[11px] text-stone">Titular</div>
                    <div className="font-bold text-[14.5px] text-navy mt-[1px] break-all" style={{ letterSpacing: ".005em" }}>{TITULAR}</div>
                  </div>
                </div>
              )}
              {CUIT && (
                <div className="flex items-center gap-[10px] px-[14px] py-[9px]" style={{ borderBottom: "1px solid rgba(14,35,60,.08)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[11px] text-stone">CUIT / CUIL</div>
                    <div className="font-bold text-[14.5px] text-navy mt-[1px] break-all" style={{ letterSpacing: ".005em" }}>{CUIT}</div>
                  </div>
                </div>
              )}
              {ALIAS && (
                <div className="flex items-center gap-[10px] px-[14px] py-[9px]" style={{ borderBottom: "1px solid rgba(14,35,60,.08)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[11px] text-stone">Alias</div>
                    <div className="font-bold text-[14.5px] text-navy mt-[1px] break-all" style={{ letterSpacing: ".005em" }}>{ALIAS}</div>
                  </div>
                </div>
              )}
              {CVU && (
                <div className="flex items-center gap-[10px] px-[14px] py-[9px]">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[11px] text-stone">CVU</div>
                    <div className="font-bold text-[14.5px] text-navy mt-[1px] break-all tracking-wide">{CVU}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Copiar alias + Ya pagué: agrupados para compartir el grid-area "cta" en desktop.
               Si la reserva expira quedan cubiertos por el diálogo de expiración (BRT-88). */}
            <div className="brot-cf-cta">
              <div>
                <button
                  type="button"
                  onClick={handleCopyAlias}
                  disabled={expired}
                  className="w-full font-bold text-[15px]"
                  style={{
                    border: "1.5px solid rgba(14,35,60,.16)",
                    background: aliasCopied ? "rgba(63,143,91,.08)" : "#fff",
                    color: aliasCopied ? "#3F8F5B" : "#0E233C",
                    borderRadius: "14px",
                    padding: "10px 6px",
                    cursor: expired ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "transform .18s cubic-bezier(.2,.7,.3,1), background .2s, color .2s, border-color .2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                >
                  {aliasCopied ? "✓ Alias copiado" : "Copiar alias"}
                </button>
                <div className="text-center text-[12.5px] text-stone" style={{ marginTop: "10px" }}>
                  Pagá desde tu app o home banking con el alias
                </div>
              </div>

              <button
                type="button"
                onClick={handleYaPague}
                disabled={loading || !hasCopiedAlias || expired}
                className="w-full font-bold text-[16.5px] tracking-[.01em]"
                style={{
                  marginTop: "22px",
                  border: "none",
                  background: "#0E233C",
                  color: "#F9F5EC",
                  borderRadius: "14px",
                  padding: "10px",
                  cursor: (loading || !hasCopiedAlias || expired) ? "not-allowed" : "pointer",
                  opacity: (loading || !hasCopiedAlias || expired) ? 0.4 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "11px",
                  transition: ctaTransition,
                }}
                onMouseEnter={(e) => { if (!loading && hasCopiedAlias && !expired) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 30px -16px rgba(14,35,60,.55)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ya pagué"}
              </button>

              {error && (
                <div className="text-center text-[13px]" style={{ color: "#C0392B", marginTop: "10px" }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : (

        /* ── Formulario (step = form) ── */
        <form onSubmit={handleSubmit} style={{ padding: "14px 22px 24px" }}>
          {/* Banda de reserva */}
          {items.length > 0 && (
            <div
              style={{
                position: "relative",
                background: (expired || isUrgent) ? "rgba(166,68,46,.10)" : "rgba(200,133,26,.10)",
                border: `1px solid ${(expired || isUrgent) ? "rgba(166,68,46,.28)" : "rgba(200,133,26,.22)"}`,
                borderRadius: "14px",
                padding: "11px 14px 12px",
                marginBottom: "18px",
                transition: "background .4s, border-color .4s",
              }}
            >
              <div className="flex items-baseline justify-between gap-[10px]" style={{ flexWrap: "nowrap" }}>
                <span
                  className="font-bold text-[13px] whitespace-nowrap"
                  style={{ color: (expired || isUrgent) ? "#A6442E" : "#0E233C" }}
                >
                  {expired ? "Tu reserva expiró" : "Te guardamos tu pedido por"}
                </span>
                <span
                  className="font-extrabold text-[15.5px] flex-none"
                  style={{ fontVariantNumeric: "tabular-nums", color: (expired || isUrgent) ? "#A6442E" : "#0E233C" }}
                >
                  {formatCountdown(secondsLeft)}
                </span>
              </div>
              <div
                className="relative rounded-full overflow-hidden"
                style={{ height: "3px", background: "rgba(14,35,60,.09)", marginTop: "8px" }}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${fillPct}%`,
                    background: (expired || isUrgent) ? "#A6442E" : "#C8851A",
                    transition: "width .25s linear, background .4s",
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Estado vacío ── */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center text-center py-4 gap-0">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-[18px]"
                style={{ background: "rgba(14,35,60,.05)", color: "#7C766A" }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>
                </svg>
              </div>
              <h4 className="font-bold text-[21px] leading-[1.25] tracking-[-0.01em] text-navy m-0 mb-2" style={{ maxWidth: "18ch" }}>
                Todavía no elegiste tu BROT
              </h4>
              <p className="text-[15px] text-stone m-0 mb-[22px]" style={{ fontStyle: "italic" }}>
                Tu pedido está vacío.
              </p>
              <button
                type="button"
                onClick={() => onClose()}
                className="btn-primary mb-3"
                style={{ maxWidth: "300px" }}
              >
                <BagIcon />
                Elegí tu BROT
              </button>
              <button
                type="button"
                onClick={() => onClose()}
                className="w-full font-semibold text-[15px] text-stone border-none bg-transparent cursor-pointer py-2"
                style={{ maxWidth: "300px" }}
              >
                Cerrar
              </button>
            </div>
          ) : (
          <div className="brot-co-body space-y-[18px]">
            {/* Resumen */}
            <div className="brot-co-order-col">
              <div
                className="font-extrabold text-[11px] text-stone uppercase"
                style={{ letterSpacing: ".09em", marginBottom: "8px" }}
              >
                Productos
              </div>
              <div
                className="brot-co-summary overflow-hidden"
                style={{ background: "#fff", borderRadius: "14px", boxShadow: "0 8px 18px -14px rgba(14,35,60,.3)", padding: "10px 14px 6px" }}
              >
                <div className="brot-co-lines">
                  {items.map((item, i) => (
                    <div
                      key={item.id}
                      className="brot-co-line flex items-center justify-between gap-3"
                      style={{ padding: "11px 0", borderBottom: i < items.length - 1 ? "1px solid rgba(14,35,60,.10)" : "none" }}
                    >
                      <span className="font-bold text-[15px] text-navy whitespace-nowrap">
                        {item.name}
                        <i className="text-stone" style={{ fontStyle: "normal", fontWeight: 500, fontSize: "12.5px", marginLeft: "9px" }}>×{item.quantity}</i>
                      </span>
                      <span className="flex items-center gap-[10px] flex-none">
                        <span className="font-bold text-[15px] text-navy whitespace-nowrap">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Quitar ${item.name}`}
                          onClick={() => onRemoveItem(item.id)}
                          className="brot-co-del w-[26px] h-[26px] inline-flex items-center justify-center rounded-[7px] border-none bg-transparent cursor-pointer text-stone"
                          style={{ transition: "background .15s, color .15s, opacity .15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(166,68,46,.10)"; e.currentTarget.style.color = "#A6442E"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ""; }}
                        >
                          <TrashIcon />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className="flex items-baseline justify-between gap-3"
                  style={{ padding: "12px 2px 4px", marginTop: "2px", borderTop: "1.5px solid #0E233C" }}
                >
                  <span className="font-bold text-[16px] text-navy">Total</span>
                  <span className="font-extrabold text-[24px] whitespace-nowrap" style={{ color: "#C8851A" }}>
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Campos */}
            <div className="brot-co-form space-y-[16px]">
              {[
                { label: "Nombre y apellido", id: "name", type: "text", value: name, onChange: (v: string) => setName(v.replace(/[0-9]/g, "")), placeholder: "Juan Pérez", required: true },
                { label: "Teléfono (WhatsApp)", id: "phone", type: "tel", value: phone, onChange: (v: string) => setPhone(v), placeholder: "11 1234-5678", required: true },
              ].map((field) => (
                <div key={field.id}>
                  <label
                    className="block font-extrabold text-[11px] text-stone uppercase"
                    style={{ letterSpacing: ".06em", marginBottom: "6px" }}
                  >
                    {field.label} <span style={{ color: "#C8851A" }}>*</span>
                  </label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full text-navy bg-white outline-none"
                    style={{
                      fontSize: "15px",
                      border: "1.5px solid rgba(14,35,60,.13)",
                      borderRadius: "12px",
                      padding: "11px 15px",
                      transition: "border-color .15s, box-shadow .15s",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#C8851A"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,133,26,.16)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(14,35,60,.13)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              ))}

              {error && (
                <div className="text-center text-[13px]" style={{ color: "#C0392B" }}>
                  {error}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="brot-co-actions" style={{ display: "flex", alignItems: "stretch", gap: "8px", marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => onClose()}
                className="flex-1 min-w-0 font-bold text-[14px] tracking-[.01em] whitespace-nowrap overflow-hidden text-ellipsis"
                style={{
                  border: "1.5px solid rgba(14,35,60,.14)",
                  background: "#fff",
                  color: "#0E233C",
                  borderRadius: "16px",
                  padding: "10px 8px",
                  cursor: "pointer",
                  transition: "transform .18s cubic-bezier(.2,.7,.3,1), background .15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F9F5EC"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = ""; }}
              >
                Seguir comprando
              </button>
              <button
                type="submit"
                disabled={expired}
                className="flex-1 min-w-0 font-bold text-[14px] tracking-[.01em] whitespace-nowrap overflow-hidden text-ellipsis"
                style={{
                  border: "none",
                  background: "#0E233C",
                  color: "#F9F5EC",
                  borderRadius: "16px",
                  padding: "10px 8px",
                  cursor: expired ? "not-allowed" : "pointer",
                  opacity: expired ? 0.4 : 1,
                  transition: ctaTransition,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 30px -16px rgba(14,35,60,.55)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                Pagar
              </button>
            </div>
          </div>
          )}
        </form>
        )}
      </div>

      {/* Toast "Alias copiado" — arriba, lejos del toast nativo de Android (que aparece abajo) */}
      {step === "payment" && (
        <div
          className="fixed left-1/2 z-50"
          style={{
            top: "28px",
            transform: toastVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-12px)",
            background: "#0E233C",
            color: "#F9F5EC",
            fontWeight: 600,
            fontSize: "14px",
            padding: "11px 20px",
            borderRadius: "12px",
            boxShadow: "0 14px 30px -10px rgba(14,35,60,.5)",
            opacity: toastVisible ? 1 : 0,
            pointerEvents: "none",
            transition: "opacity .2s, transform .2s",
          }}
        >
          Alias copiado
        </div>
      )}

      {/* Diálogo de expiración (BRT-88) — unificado para los dos pasos */}
      {expired && (
        <ConfirmDialog
          icon="clock"
          message="Se ha terminado el tiempo para completar el pago del carrito."
          confirmLabel="OK"
          onConfirm={() => onClose(true)}
        />
      )}

      {/* Diálogo de confirmación al cerrar con la X (BRT-88) */}
      {showCloseConfirm && (
        <ConfirmDialog
          icon="warning"
          message="Al cerrar esta pantalla se perderán los productos seleccionados. ¿Cerrar de todos modos?"
          confirmLabel="SÍ"
          cancelLabel="NO"
          onConfirm={() => { setShowCloseConfirm(false); onClose(true); }}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </div>
  );
}
