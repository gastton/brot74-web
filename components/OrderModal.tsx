"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface OrderModalProps {
  items: CartItem[];
  slotId: number;
  deliveryMode: "pickup" | "delivery" | "both";
  slotLabel: string;
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

export default function OrderModal({ items, slotId, deliveryMode, slotLabel, onClose, onSuccess }: OrderModalProps) {
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [step, setStep]       = useState<"form" | "payment">("form");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [wantsDelivery, setWantsDelivery] = useState(deliveryMode === "delivery");

  const CVU     = process.env.NEXT_PUBLIC_CVU     ?? "";
  const ALIAS   = process.env.NEXT_PUBLIC_ALIAS   ?? "";
  const TITULAR = process.env.NEXT_PUBLIC_TITULAR ?? "";
  const CUIT    = process.env.NEXT_PUBLIC_CUIT    ?? "";
  const WA      = process.env.NEXT_PUBLIC_WHATSAPP ?? "";

  const isDelivery = deliveryMode === "delivery" ? true : deliveryMode === "pickup" ? false : wantsDelivery;
  const modeLabel  = deliveryMode === "both" ? (isDelivery ? "Delivery" : "Retiro en casa") : deliveryMode === "delivery" ? "Delivery" : "Retiro en casa";
  const total      = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al procesar el pedido"); return; }
      setOrderId(data.orderId);
      setStep("payment");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

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
            <div
              className="text-[14.5px] text-stone mt-[5px]"
              style={{ fontFamily: "var(--font-newsreader, 'Newsreader', Georgia, serif)", fontStyle: "italic" }}
            >
              {slotLabel} · {modeLabel}
            </div>
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
          <div className="brot-co-body space-y-[18px]">
            {/* Resumen — columna izquierda en desktop */}
            <div
              className="brot-co-summary overflow-hidden"
              style={{ background: "#fff", border: "1px solid rgba(14,35,60,.08)", borderRadius: "16px", boxShadow: "0 14px 26px -20px rgba(14,35,60,.4)", padding: "18px 20px" }}
            >
              {items.map((item) => (
                <div key={item.id} className="flex items-baseline justify-between gap-3 pb-[14px]">
                  <span className="font-semibold text-[16px] text-navy whitespace-nowrap">
                    {item.name}{" "}
                    <i className="not-italic font-medium text-[14px] text-stone">×{item.quantity}</i>
                  </span>
                  <span className="font-bold text-[16px] text-navy whitespace-nowrap">
                    {formatCurrency(item.price * item.quantity)}
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

            {/* Campos — columna derecha en desktop */}
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
                          wantsDelivery === value
                            ? "text-navy"
                            : "text-stone"
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

              {/* Campos del formulario */}
              {[
                { label: "Nombre y apellido", id: "name", type: "text", value: name, onChange: (v: string) => setName(v), placeholder: "Juan Pérez", required: true },
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
                disabled={loading}
                className="btn-primary"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BagIcon />}
                {loading ? "Procesando..." : "Confirmar y pagar"}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
