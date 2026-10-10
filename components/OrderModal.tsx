"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ShoppingCart } from "lucide-react";
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
  // BRT-95: el paso ahora lo controla la URL (page.tsx) en vez de un
  // useState interno — así "atrás" desde el paso de pago vuelve al form
  // en vez de cerrar todo el checkout.
  step: "form" | "payment";
  sessionToken: string;
  expiresAt: string;
  onRemoveItem: (productId: number) => void;
  onChangeQuantity: (productId: number, newQuantity: number) => void;
  onAdvanceToPayment: () => void;
  onClose: (clearCart?: boolean) => void;
  onSuccess: (orderId: number) => void;
}

const MODAL_STYLE = {
  background: "#fff",
  borderRadius: 0,
  boxShadow: "0 40px 80px -24px rgba(14,35,60,.6)",
} as const;

const ctaTransition = "transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s";


function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18"/>
    </svg>
  );
}

function BagIcon({ stroke = "#F4EEE2" }: { stroke?: string }) {
  return <ShoppingCart size={20} color={stroke} strokeWidth={1.8} />;
}

function HourglassIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2.5h14M5 21.5h14"/>
      <path d="M7 2.5v3.2c0 2 1.6 3.6 3.6 5.1L12 12l1.4-1.2C15.4 9.3 17 7.7 17 5.7V2.5"/>
      <path d="M7 21.5v-3.2c0-2 1.6-3.6 3.6-5.1L12 12l1.4 1.2c2 1.5 3.6 3.1 3.6 5.1v3.2"/>
      <path d="M9.2 19.5h5.6L12 17.2Z" fill="#0E233C" stroke="none"/>
      <path d="M9.6 6.8h4.8" strokeWidth="1.4"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                borderRadius: "var(--brot-radius)",
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
              color: "#F4EEE2",
              borderRadius: "var(--brot-radius)",
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

// BRT-182: recordar nombre y teléfono entre pedidos. Envuelto en try/catch
// porque localStorage puede tirar (modo incógnito, navegador que lo
// bloquea) — ante cualquier falla, se degrada a formulario vacío sin romper
// el flujo.
const CONTACT_STORAGE_KEY = "brot74-contact";

function loadSavedContact(): { name: string; phone: string } {
  try {
    const raw = localStorage.getItem(CONTACT_STORAGE_KEY);
    if (!raw) return { name: "", phone: "" };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed?.name === "string" ? parsed.name : "",
      phone: typeof parsed?.phone === "string" ? parsed.phone : "",
    };
  } catch {
    return { name: "", phone: "" };
  }
}

function saveContact(name: string, phone: string) {
  try {
    localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify({ name, phone }));
  } catch {
    /* localStorage no disponible — no hay nada que persistir */
  }
}

export default function OrderModal({ items, slotId, slotLabel, step, sessionToken, expiresAt, onRemoveItem, onAdvanceToPayment, onClose, onSuccess }: OrderModalProps) {
  const [name, setName]       = useState(() => loadSavedContact().name);
  const [phone, setPhone]     = useState(() => loadSavedContact().phone);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );
  const [expired, setExpired] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [aliasCopied, setAliasCopied] = useState(false); // feedback transitorio del botón (1.4s)
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
    onAdvanceToPayment();
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
      saveContact(name.trim(), phone.trim());
      return data.orderId;
    } catch {
      orderDoneRef.current = false;
      setError("Error de conexión. Intentá de nuevo.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  const isUrgent = secondsLeft <= 120;

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
        {/* Header — v45: sin filete ni subtítulo de fecha en Tu pedido */}
        <div className="flex items-start justify-between gap-[14px] px-5 min-[900px]:px-[30px] pt-[26px]">
          <div>
            <h3 className="brot-h brot-h--modal">
              {step === "payment" ? "Pagá por transferencia" : "Tu pedido"}
            </h3>
            {step === "payment" && (
              <div className="text-[15px] text-stone mt-2">{slotLabel}</div>
            )}
          </div>
          <button
            onClick={handleCloseClick}
            aria-label="Cerrar"
            className="flex-none -mt-2 -mr-3 w-11 h-11 flex items-center justify-center border-none bg-transparent p-0"
            style={{ cursor: "pointer" }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* ── Pantalla de pago (step = payment) ── */}
        {step === "payment" ? (
          <div className="brot-cf-body flex flex-col flex-1 px-5 min-[900px]:px-[30px] pt-[6px] pb-6">
            {/* Total — filete navy solo abajo */}
            <div className="brot-cf-tot text-center" style={{ marginTop: "16px", padding: "22px 0 20px", borderBottom: "1px solid #0E233C" }}>
              <div className="brot-mlabel" style={{ fontWeight: 500 }}>Total a transferir</div>
              <div className="brot-cf-tot-amount leading-none mt-[10px]" style={{ fontSize: "56px", fontWeight: 300, letterSpacing: "-.03em", color: "#C8851A", fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(total)}
              </div>
            </div>

            {/* Datos bancarios — lista abierta con divisores claros */}
            <div className="brot-cf-data" style={{ marginTop: "6px" }}>
              {ALIAS && (
                <div className="flex items-center gap-2" style={{ padding: "10px 0", borderBottom: "1px solid rgba(14,35,60,.10)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>Alias</div>
                    <div className="text-[18px] text-navy mt-[2px] break-all">{ALIAS}</div>
                  </div>
                  <button type="button" onClick={handleCopyAlias} disabled={expired} className="brot-ghost">
                    {aliasCopied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              )}
              {TITULAR && (
                <div className="flex items-center gap-2" style={{ padding: "10px 0", borderBottom: "1px solid rgba(14,35,60,.10)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>Titular</div>
                    <div className="text-[16px] text-navy mt-[2px] break-all">{TITULAR}</div>
                  </div>
                </div>
              )}
              {CUIT && (
                <div className="flex items-center gap-2" style={{ padding: "10px 0", borderBottom: "1px solid rgba(14,35,60,.10)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>CUIT / CUIL</div>
                    <div className="text-[16px] text-navy mt-[2px] break-all" style={{ fontVariantNumeric: "tabular-nums" }}>{CUIT}</div>
                  </div>
                </div>
              )}
              {CVU && (
                <div className="flex items-center gap-2" style={{ padding: "10px 0" }}>
                  <div className="flex-1 min-w-0">
                    <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>CVU</div>
                    <div className="text-[16px] text-navy mt-[2px] break-all" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: ".03em" }}>{CVU}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Indicación + Ya pagué: agrupados para compartir el grid-area "cta" en desktop.
               Si la reserva expira quedan cubiertos por el diálogo de expiración (BRT-88). */}
            <div className="brot-cf-cta mt-auto">
              <p className="text-[15px] text-stone m-0" style={{ margin: "14px 0 22px" }}>
                Pagá desde tu app o home banking con el alias
              </p>

              <button
                type="button"
                onClick={handleYaPague}
                disabled={loading || expired}
                className="brot-pill"
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-5 min-[900px]:px-[30px] pt-[10px] pb-6">
          {/* Reserva — v45: reloj de arena en círculo + cuenta regresiva, sin caja ni barra */}
          {items.length > 0 && (
            <div className="flex items-center gap-3" style={{ padding: "10px 0", marginBottom: "14px" }}>
              <span className="brot-ring">
                <HourglassIcon />
              </span>
              <span className="flex-1 text-[16px]" style={{ color: (expired || isUrgent) ? "#A6442E" : "#0E233C" }}>
                {expired ? "Tu reserva expiró" : "Te guardamos el pedido"}
              </span>
              <span
                className="flex-none"
                style={{ fontSize: "18px", fontWeight: 500, fontVariantNumeric: "tabular-nums", color: (expired || isUrgent) ? "#A6442E" : "#8A5A0E" }}
              >
                {formatCountdown(secondsLeft)}
              </span>
            </div>
          )}

          {/* ── Estado vacío ── */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center text-center py-4 gap-0">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-[18px]"
                style={{ background: "rgba(14,35,60,.05)", color: "#7C766A" }}
              >
                <ShoppingCart size={30} color="currentColor" strokeWidth={1.6} />
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
                className="brot-pill mb-3"
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
          <div className="brot-co-body flex flex-col gap-[18px] flex-1">
            {/* Resumen — v45: sin tarjeta, lista con filetes; el Total cierra con filete navy */}
            <div className="brot-co-order-col">
              <div className="brot-co-summary">
                <div className="brot-co-lines" style={{ borderTop: "1px solid rgba(14,35,60,.10)" }}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="brot-co-line flex items-center justify-between gap-2"
                      style={{ padding: "10px 0", borderBottom: "1px solid rgba(14,35,60,.10)" }}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="text-[16px] text-navy">
                          {item.name} <span className="whitespace-nowrap" style={{ color: "#4A5463", marginLeft: "6px" }}>× {item.quantity}</span>
                        </span>
                        <span className="block whitespace-nowrap text-[12px] sm:text-[13px]" style={{ color: "#4A5463", fontVariantNumeric: "tabular-nums" }}>
                          {formatCurrency(item.price)} c/u
                        </span>
                      </span>
                      <span className="flex-none flex items-center -mr-[6px]">
                        <span className="text-[16px] text-navy whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Quitar ${item.name}`}
                          onClick={() => onRemoveItem(item.id)}
                          className="brot-co-del w-11 h-11 inline-flex items-center justify-center rounded-full border-none bg-transparent cursor-pointer text-stone"
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
                <div className="brot-co-total flex items-baseline justify-between gap-3">
                  <span className="brot-mlabel" style={{ color: "#0E233C", fontWeight: 500 }}>Total</span>
                  <span className="text-[26px] font-medium whitespace-nowrap" style={{ color: "#8A5A0E", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tus datos — campos con rótulo interno (solo subrayado) */}
            <div className="brot-co-form" style={{ marginTop: "auto" }}>
              <div className="brot-co-datos-title">Tus datos</div>
              <div className="flex flex-col gap-[6px]" style={{ marginTop: "10px" }}>
                {[
                  { label: "Nombre y apellido", id: "name", type: "text", value: name, onChange: (v: string) => setName(v.replace(/[0-9]/g, "")), placeholder: "Juan Pérez", required: true },
                  { label: "Teléfono (WhatsApp)", id: "phone", type: "tel", value: phone, onChange: (v: string) => setPhone(v), placeholder: "11 1234-5678", required: true },
                ].map((field) => (
                  <label key={field.id} className="brot-fl">
                    <span>{field.label}</span>
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  </label>
                ))}
              </div>

              {error && (
                <div className="text-center text-[13px]" style={{ color: "#C0392B", marginTop: "10px" }}>
                  {error}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="brot-co-actions" style={{ display: "flex", alignItems: "stretch", gap: "10px", marginTop: "18px" }}>
              <button
                type="button"
                onClick={() => onClose()}
                className="brot-pill brot-pill--ghost"
                style={{ flex: 1, minWidth: 0, padding: "0 14px" }}
              >
                Seguir comprando
              </button>
              <button
                type="submit"
                disabled={expired}
                className="brot-pill"
                style={{ flex: 1, minWidth: 0, padding: "0 14px", gap: "6px", whiteSpace: "nowrap" }}
              >
                Pagar
                <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatCurrency(total)}</span>
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
            borderRadius: "999px",
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
