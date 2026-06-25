"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
  deliveryMode: "pickup" | "delivery" | "both";
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

function CopyIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3F8F5B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7"/>
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#F4EEE2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l9-9a3.3 3.3 0 0 1 4.7 4.7l-9 9a1.7 1.7 0 0 1-2.4-2.4l8-8"/>
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/>
    </svg>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copiar"
      className="flex-none flex items-center justify-center rounded-[12px]"
      style={{
        width: "42px",
        height: "42px",
        background: "#F4EEE2",
        border: "1px solid rgba(14,35,60,.10)",
        cursor: "pointer",
        color: "#0E233C",
        transition: "transform .14s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(.92)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
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

export default function OrderModal({ items, slotId, deliveryMode, slotLabel, slotLocation, sessionToken, expiresAt, onRemoveItem, onChangeQuantity, onClose, onSuccess }: OrderModalProps) {
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [step, setStep]       = useState<"form" | "payment">("form");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [wantsDelivery, setWantsDelivery] = useState(deliveryMode === "delivery");
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );
  const [expired, setExpired] = useState(false);

  const orderDoneRef = useRef(false);

  const CVU     = process.env.NEXT_PUBLIC_CVU     ?? "";
  const ALIAS   = process.env.NEXT_PUBLIC_ALIAS   ?? "";
  const TITULAR = process.env.NEXT_PUBLIC_TITULAR ?? "";
  const CUIT    = process.env.NEXT_PUBLIC_CUIT    ?? "";
  const WA      = process.env.NEXT_PUBLIC_WHATSAPP ?? "";

  const isDelivery = deliveryMode === "delivery" ? true : deliveryMode === "pickup" ? false : wantsDelivery;
  const modeLabel  = deliveryMode === "both" ? (isDelivery ? "Delivery" : "Retiro en casa") : deliveryMode === "delivery" ? "Delivery" : "Retiro en casa";
  const total      = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

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
      if (!orderDoneRef.current && sessionToken) {
        const blob = new Blob([JSON.stringify({ sessionToken })], { type: "application/json" });
        navigator.sendBeacon("/api/cart/release", blob);
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (expired) { setError("Tu reserva expiró. Cerrá y volvé a intentar."); return; }
    if (!name.trim() || !phone.trim()) { setError("Nombre y teléfono son requeridos"); return; }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) { setError("El teléfono debe tener entre 8 y 15 dígitos"); return; }
    if (isDelivery && !address.trim()) { setError("La dirección es requerida para delivery"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: digits,
          customerAddress: isDelivery ? address.trim() : "",
          deliverySlotId: slotId,
          notes: notes.trim(),
          isDelivery,
          sessionToken,
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al procesar el pedido"); return; }
      orderDoneRef.current = true;
      setOrderId(data.orderId);
      setStep("payment");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const TOTAL_SECONDS = 15 * 60;
  const isUrgent = secondsLeft <= 120;
  const fillPct = ((secondsLeft / TOTAL_SECONDS) * 100).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: "19px" }}>
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
        <div className="flex items-start justify-between gap-[14px] px-[26px] pt-[24px] pb-[18px]">
          <div>
            <h3 className="font-bold text-[27px] tracking-[-0.01em] text-navy m-0">
              {step === "payment" ? "Pagá por transferencia" : "Tu pedido"}
            </h3>
            {(step === "payment" || items.length > 0) && (
              <div
                className="text-[14.5px] text-stone mt-[5px]"
                style={{ fontFamily: "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)", fontStyle: "italic" }}
              >
                {slotLabel}{slotLocation ? ` · ${slotLocation}` : ` · ${modeLabel}`}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
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
        {step === "payment" && orderId ? (
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
              style={{ background: "#fff", border: "1px solid rgba(14,35,60,.08)", borderRadius: "16px", boxShadow: "0 14px 26px -20px rgba(14,35,60,.4)" }}
            >
              {TITULAR && (
                <div className="flex items-center gap-3 px-5 py-[15px]" style={{ borderBottom: "1px solid rgba(14,35,60,.08)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[13px] text-stone">Titular</div>
                    <div className="font-bold text-[18px] text-navy mt-[3px] break-all">{TITULAR}</div>
                  </div>
                </div>
              )}
              {CUIT && (
                <div className="flex items-center gap-3 px-5 py-[15px]" style={{ borderBottom: "1px solid rgba(14,35,60,.08)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[13px] text-stone">CUIT / CUIL</div>
                    <div className="font-bold text-[18px] text-navy mt-[3px] break-all">{CUIT}</div>
                  </div>
                </div>
              )}
              {ALIAS && (
                <div className="flex items-center gap-3 px-5 py-[15px]" style={{ borderBottom: "1px solid rgba(14,35,60,.08)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[13px] text-stone">Alias</div>
                    <div className="font-bold text-[18px] text-navy mt-[3px] break-all">{ALIAS}</div>
                  </div>
                  <CopyButton value={ALIAS} />
                </div>
              )}
              {CVU && (
                <div className="flex items-center gap-3 px-5 py-[15px]">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[13px] text-stone">CVU</div>
                    <div className="font-bold text-[18px] text-navy mt-[3px] break-all tracking-wide">{CVU}</div>
                  </div>
                  <CopyButton value={CVU} />
                </div>
              )}
            </div>

            {/* Compartir comprobante */}
            <a
              href={`https://wa.me/${WA}?text=${encodeURIComponent(`Hola! Te mando el comprobante del pedido #${orderId} por ${formatCurrency(total)}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setTimeout(() => onSuccess(orderId), 500)}
              className="brot-cf-cta w-full font-bold text-[16.5px] tracking-[.01em] py-[17px] rounded-[14px] flex items-center justify-center gap-[11px] no-underline"
              style={{
                background: "#0E233C",
                color: "#F4EEE2",
                transition: ctaTransition,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 30px -16px rgba(14,35,60,.55)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
            >
              Compartir comprobante
              <ClipIcon />
            </a>
          </div>
        ) : (

        /* ── Formulario (step = form) ── */
        <form onSubmit={handleSubmit} className="px-[26px] py-[22px]">
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
              <div className="font-bold text-[14.5px] text-navy mb-2">Productos</div>
              <div
                className="brot-co-summary overflow-hidden"
                style={{ background: "#fff", border: "1px solid rgba(14,35,60,.08)", borderRadius: "16px", boxShadow: "0 14px 26px -20px rgba(14,35,60,.4)", padding: "18px 20px" }}
              >
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 pb-[14px]"
                    style={{ borderTop: i > 0 ? "1px solid rgba(14,35,60,.08)" : "none", paddingTop: i > 0 ? "14px" : "0" }}
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
              {/* Selector retiro / delivery */}
              {deliveryMode === "both" && (
                <div>
                  <label className="block font-bold text-[14.5px] text-navy mb-2">¿Cómo querés recibirlo?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ label: "Retiro en casa", value: false, icon: <HomeIcon /> }, { label: "Delivery", value: true, icon: <TruckIcon /> }].map(({ label, value, icon }) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setWantsDelivery(value)}
                        className={cn(
                          "flex items-center justify-center gap-2 p-3 rounded-xl text-[14px] font-semibold transition-all",
                          wantsDelivery === value ? "text-navy" : "text-stone"
                        )}
                        style={{
                          border: `1.5px solid ${wantsDelivery === value ? "#C8851A" : "rgba(14,35,60,.16)"}`,
                          background: wantsDelivery === value ? "rgba(200,133,26,.08)" : "#fff",
                        }}
                      >
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {[
                { label: "Nombre y apellido", id: "name", type: "text", value: name, onChange: (v: string) => setName(v.replace(/[0-9]/g, "")), placeholder: "Juan Pérez", required: true },
                { label: "Teléfono (WhatsApp)", id: "phone", type: "tel", value: phone, onChange: (v: string) => setPhone(v), placeholder: "11 1234-5678", required: true },
              ].map((field) => (
                <div key={field.id}>
                  <label className="block font-bold text-[14.5px] text-navy mb-2">
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

              {isDelivery && (
                <div>
                  <label className="block font-bold text-[14.5px] text-navy mb-2">
                    Dirección de delivery <span style={{ color: "#C8851A" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Av. Corrientes 1234, CABA"
                    required
                    className="brot-input"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-[14.5px] text-navy mb-2">Notas (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguna aclaración sobre tu pedido…"
                  rows={3}
                  className="brot-input"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || expired}
                className="btn-primary"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BagIcon />}
                {loading ? "Procesando..." : "Confirmar y pagar"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full font-semibold text-[15px] text-navy border-none bg-transparent cursor-pointer flex items-center justify-center gap-2 py-2 mt-0"
                style={{ transition: "color .15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#C8851A"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = ""; }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6"/>
                </svg>
                Seguir comprando
              </button>
            </div>
          </div>
          )}
        </form>
        )}
      </div>
    </div>
  );
}
