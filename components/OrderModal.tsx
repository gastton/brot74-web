"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
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
  slotLocation: string;
  sessionToken: string;
  expiresAt: string;
  onRemoveItem: (productId: number) => void;
  onChangeQuantity: (productId: number, newQuantity: number) => void;
  onClose: () => void;
  onSuccess: (orderId: number) => void;
}

const MODAL_STYLE = {
  background: "#FBF7EF",
  borderRadius: "22px",
  boxShadow: "0 40px 80px -24px rgba(14,35,60,.6)",
} as const;

const HAIR = { height: "1px", background: "rgba(14,35,60,.10)" } as const;

const ctaTransition = "transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s";

// Deep links para abrir cada billetera desde el botón de pago.
// NX y MD son la mejor estimación disponible (no documentados oficialmente
// por el proveedor) — actualizar acá si se confirma el esquema real.
const WALLET_APPS: Record<string, { scheme: string; androidPackage: string }> = {
  mp: { scheme: "mercadopago", androidPackage: "com.mercadopago.wallet" },
  nx: { scheme: "naranjax", androidPackage: "com.tarjetanaranja.ncuenta" },
  md: { scheme: "modo", androidPackage: "com.playdigital.modo" },
};

function isAndroid() {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

// Android: intent:// con fallback a Play Store. No abre la app directo (el
// esquema no matchea el intent-filter real de estas apps), pero al menos
// deja al usuario en la ficha correcta desde donde "Abrir" sí funciona —
// mejor que las otras variantes probadas (nada, o Play Store duplicado).
// iOS/desktop: esquema simple; si la app no está instalada no pasa nada visible.
function openWalletApp(id: string) {
  const app = WALLET_APPS[id];
  if (!app) return;
  if (isAndroid()) {
    const fallback = encodeURIComponent(`https://play.google.com/store/apps/details?id=${app.androidPackage}`);
    window.location.href = `intent://#Intent;scheme=${app.scheme};package=${app.androidPackage};S.browser_fallback_url=${fallback};end`;
  } else {
    window.location.href = `${app.scheme}://`;
  }
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18"/>
    </svg>
  );
}

function BagIcon({ stroke = "#F4EEE2" }: { stroke?: string }) {
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



function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function OrderModal({ items, slotId, slotLabel, slotLocation, sessionToken, expiresAt, onRemoveItem, onChangeQuantity, onClose, onSuccess }: OrderModalProps) {
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
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const orderDoneRef = useRef(false);
  const successScheduledRef = useRef(false);
  // Se marca apenas el usuario toca una opción de pago — antes de intentar
  // abrir la app. En Android, navegar a un esquema/intent:// puede disparar
  // beforeunload; sin este guard, el handler de abajo alcanza a liberar la
  // reserva antes de que el pedido termine de crearse.
  const walletChosenRef = useRef(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const CVU     = process.env.NEXT_PUBLIC_CVU     ?? "";
  const ALIAS   = process.env.NEXT_PUBLIC_ALIAS   ?? "";
  const TITULAR = process.env.NEXT_PUBLIC_TITULAR ?? "";
  const CUIT    = process.env.NEXT_PUBLIC_CUIT    ?? "";

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Countdown timer
  useEffect(() => {
    if (step === "payment") return;

    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(interval);
        setExpired(true);
        // Close modal after 4 seconds so user sees the message
        setTimeout(onClose, 4000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, step, onClose]);

  // Release reservation if user closes the tab/navigates away mid-checkout
  useEffect(() => {
    function handleBeforeUnload() {
      if (!orderDoneRef.current && !walletChosenRef.current && sessionToken) {
        const blob = new Blob([JSON.stringify({ sessionToken })], { type: "application/json" });
        navigator.sendBeacon("/api/cart/release", blob);
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionToken]);

  // "Pagar": solo valida y pasa a la pantalla de transferencia — el pedido
  // todavía no existe en la DB, se crea recién cuando el usuario elige una
  // opción de pago (ver handleWalletClick).
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (expired) { setError("Tu reserva expiró. Cerrá y volvé a intentar."); return; }
    if (!name.trim() || !phone.trim()) { setError("Nombre y teléfono son requeridos"); return; }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) { setError("El teléfono debe tener entre 8 y 15 dígitos"); return; }
    setStep("payment");
  }

  // Crea el pedido recién cuando el usuario elige una opción de pago.
  // Si ya se creó (o se está creando) por un click anterior, no repite el
  // POST — solo copia el alias / reintenta abrir la app.
  async function createOrder(): Promise<number | null> {
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
        walletChosenRef.current = false;
        setError(data.error ?? "Error al procesar el pedido");
        return null;
      }
      setOrderId(data.orderId);
      return data.orderId;
    } catch {
      orderDoneRef.current = false;
      walletChosenRef.current = false;
      setError("Error de conexión. Intentá de nuevo.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  const TOTAL_SECONDS = 15 * 60;
  const isUrgent = secondsLeft <= 120;
  const fillPct = ((secondsLeft / TOTAL_SECONDS) * 100).toFixed(2);

  function handleCloseClick() {
    if (step === "form" && (name.trim() || phone.trim())) {
      if (!window.confirm("Vas a perder los datos que escribiste. ¿Cerrar igual?")) return;
    }
    onClose();
  }

  async function handleWalletClick(id: string) {
    walletChosenRef.current = true;
    navigator.clipboard?.writeText(ALIAS).catch(() => {});
    openWalletApp(id);
    setCopiedWallet(id);
    setTimeout(() => setCopiedWallet((w) => (w === id ? null : w)), 1400);
    setToastVisible(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 1600);

    const newOrderId = await createOrder();
    if (newOrderId != null && !successScheduledRef.current) {
      successScheduledRef.current = true;
      setTimeout(() => onSuccess(newOrderId), 1000);
    }
  }

  return (
    <div className="brot-co-backdrop fixed inset-0 z-50 flex justify-center overflow-y-auto" style={{ padding: "19px" }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(14,35,60,.58)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="brot-co-modal relative w-full overflow-y-auto"
        style={{ ...MODAL_STYLE, maxWidth: "392px", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-[14px] px-[18px] pt-[24px] pb-[18px]">
          <div>
            <h3 className="font-bold text-[27px] tracking-[-0.01em] text-navy m-0">
              {step === "payment" ? "Pagá por transferencia" : "Tu pedido"}
            </h3>
            {(step === "payment" || items.length > 0) && (
              <div
                className="text-[14.5px] text-stone mt-[5px]"
                style={{ fontFamily: "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)", fontStyle: "italic" }}
              >
                {slotLabel}{slotLocation ? ` · ${slotLocation}` : ` · Retiro en casa`}
              </div>
            )}
          </div>
          <button
            onClick={handleCloseClick}
            aria-label="Cerrar"
            className="flex-none mt-0.5 flex items-center justify-center border-none bg-transparent p-0"
            style={{ cursor: "pointer", transition: "transform .15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Banda de reserva (v12) — solo durante el formulario con ítems */}
        {step === "form" && items.length > 0 && (
          <div
            className="mx-[26px] mb-[14px] rounded-[14px] overflow-hidden"
            style={{
              background: (expired || isUrgent) ? "rgba(166,68,46,.12)" : "rgba(200,133,26,.12)",
              border: `1px solid ${(expired || isUrgent) ? "rgba(166,68,46,.28)" : "rgba(200,133,26,.22)"}`,
              padding: "14px 16px 16px",
              transition: "background .4s, border-color .4s",
            }}
          >
            <div className="flex items-center gap-3">
              {/* Ícono */}
              <span
                className={(expired || isUrgent) ? "brot-rsv-pulse" : ""}
                style={{
                  flexShrink: 0,
                  width: "30px",
                  height: "30px",
                  borderRadius: "9px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: (expired || isUrgent) ? "#A6442E" : "#C8851A",
                  color: "#fff",
                  transition: "background .4s",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
                </svg>
              </span>
              {/* Texto */}
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[13.5px] text-navy leading-[1.2]">
                  {expired ? "Tu reserva expiró" : "Te guardamos tu pedido"}
                </span>
                <span className="block text-[12px] text-stone mt-[2px]">
                  {expired ? "Podés volver a intentar." : "Confirmá antes de que termine el tiempo."}
                </span>
              </span>
              {/* MM:SS */}
              <span
                className="font-extrabold text-[23px] text-navy whitespace-nowrap"
                style={{ fontVariantNumeric: "tabular-nums", letterSpacing: ".01em" }}
              >
                {formatCountdown(secondsLeft)}
              </span>
            </div>
            {/* Barra de progreso */}
            <div
              className="relative h-[4px] rounded-full mt-[13px] overflow-hidden"
              style={{ background: "rgba(14,35,60,.10)" }}
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

            {/* Billeteras: copian el alias y, cuando corresponde, intentan abrir la app */}
            <div>
              <div className="flex gap-[10px] justify-center">
                {([
                  { id: "mp", label: "Mercado Pago", logo: "/billeteras/mp-cream.png" },
                  { id: "nx", label: "NaranjaX", logo: "/billeteras/nx-cream.png" },
                  { id: "md", label: "Modo", logo: "/billeteras/md-cream.png" },
                  { id: "ot", label: "Otro banco", logo: "/billeteras/banco-cream.png" },
                ] as const).map((w) => {
                  const isCopied = copiedWallet === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      aria-label={w.label}
                      onClick={() => handleWalletClick(w.id)}
                      className="relative overflow-hidden flex-none"
                      style={{
                        width: "56px",
                        height: "56px",
                        border: "none",
                        borderRadius: "50%",
                        padding: 0,
                        background: "#F4EEE2",
                        cursor: "pointer",
                        boxShadow: isCopied ? "0 0 0 3px #3F8F5B" : "none",
                        transition: "transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                    >
                      <Image
                        src={w.logo}
                        alt={w.label}
                        fill
                        className="object-cover"
                        style={{ borderRadius: "50%", transform: "scale(1.5)" }}
                        sizes="56px"
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-center text-[12.5px] text-stone" style={{ marginTop: "10px" }}>
                {loading ? "Confirmando tu pedido…" : "Abrí tu app con el alias ya copiado"}
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm text-center" style={{ marginTop: "14px" }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : (

        /* ── Formulario (step = form) ── */
        <form onSubmit={handleSubmit} className="pt-[22px] pb-[26px] px-[18px]">
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
                onClick={onClose}
                className="btn-primary mb-3"
                style={{ maxWidth: "300px" }}
              >
                <BagIcon />
                Elegí tu BROT
              </button>
              <button
                type="button"
                onClick={onClose}
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
              <div className="font-bold text-[14.5px] text-navy mb-[5px]">Productos</div>
              <div
                className="brot-co-summary overflow-hidden"
                style={{ background: "#fff", border: "1px solid rgba(14,35,60,.08)", borderRadius: "16px", boxShadow: "0 14px 26px -20px rgba(14,35,60,.4)", padding: "18px 16px" }}
              >
                <div className="brot-co-lines">
                  {items.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 pb-[8px]"
                      style={{ paddingTop: i > 0 ? "8px" : "0" }}
                    >
                      <span className="font-semibold text-[16px] text-navy leading-snug">
                        {item.name}{" "}
                        <span className="font-medium text-[14px] text-stone">×{item.quantity}</span>
                      </span>
                      <span className="flex items-center gap-3 flex-none">
                        <span className="font-bold text-[16px] text-navy whitespace-nowrap">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Quitar ${item.name}`}
                          onClick={() => onRemoveItem(item.id)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-[8px] border-none bg-transparent cursor-pointer text-stone"
                          style={{ transition: "background .15s, color .15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(166,68,46,.10)"; e.currentTarget.style.color = "#A6442E"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ""; }}
                        >
                          <TrashIcon />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
                <div style={HAIR} />
                <div className="flex items-baseline justify-between gap-3 pt-[14px]">
                  <span className="font-bold text-[19px] text-navy">Total</span>
                  <span className="font-bold text-[24px] whitespace-nowrap" style={{ color: "#C8851A" }}>
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Campos */}
            <div className="brot-co-form space-y-[18px]">
              {[
                { label: "Nombre y apellido", id: "name", type: "text", value: name, onChange: (v: string) => setName(v.replace(/[0-9]/g, "")), placeholder: "Juan Pérez", required: true },
                { label: "Teléfono (WhatsApp)", id: "phone", type: "tel", value: phone, onChange: (v: string) => setPhone(v), placeholder: "11 1234-5678", required: true },
              ].map((field) => (
                <div key={field.id}>
                  <label className="block font-bold text-[14.5px] text-navy mb-[5px]">
                    {field.label} <span style={{ color: "#C8851A" }}>*</span>
                  </label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="brot-input"
                  />
                </div>
              ))}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="brot-co-actions" style={{ display: "flex", alignItems: "stretch", gap: "8px", marginTop: "22px" }}>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-w-0 font-bold text-[13.5px] tracking-[.01em] whitespace-nowrap overflow-hidden text-ellipsis"
                style={{
                  border: "1.5px solid rgba(14,35,60,.16)",
                  background: "#fff",
                  color: "#0E233C",
                  borderRadius: "14px",
                  padding: "14px 6px",
                  cursor: "pointer",
                  transition: "transform .18s cubic-bezier(.2,.7,.3,1), background .15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F4EEE2"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = ""; }}
              >
                Seguir comprando
              </button>
              <button
                type="submit"
                disabled={expired}
                className="flex-1 min-w-0 font-bold text-[13.5px] tracking-[.01em] whitespace-nowrap overflow-hidden text-ellipsis"
                style={{
                  border: "none",
                  background: "#0E233C",
                  color: "#F4EEE2",
                  borderRadius: "14px",
                  padding: "14px 6px",
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
            color: "#F4EEE2",
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
    </div>
  );
}
