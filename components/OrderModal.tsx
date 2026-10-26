"use client";

import { useState, useRef } from "react";
import { Loader2, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import QtyCapsule from "./QtyCapsule";
import { MAX_PER_PRODUCT } from "@/lib/cartItems";
import PickupDateRow from "./PickupDateRow";
import ExitDialog from "./ExitDialog";

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
  slotDate: string;
  pickupTime: string;
  // Fecha de delivery: pide la dirección (obligatoria). El tipo lo define la fecha.
  isDelivery: boolean;
  // v46: "Sumar más panes" se oculta cuando ya están todos los panes de la fecha en el pedido
  canAddMore: boolean;
  // BRT-95: el paso ahora lo controla la URL (page.tsx) en vez de un
  // useState interno — así "atrás" desde el paso de pago vuelve al form
  // en vez de cerrar todo el checkout.
  step: "form" | "payment";
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

export default function OrderModal({ items, slotId, slotDate, pickupTime, isDelivery, step, onRemoveItem, onChangeQuantity, canAddMore, onAdvanceToPayment, onClose, onSuccess }: OrderModalProps) {
  const [name, setName]       = useState(() => loadSavedContact().name);
  const [phone, setPhone]     = useState(() => loadSavedContact().phone);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderSignature, setOrderSignature] = useState("");
  // Total que calculó el servidor al crear el pedido: es el que hay que
  // transferir (puede diferir del calculado acá si un precio cambió mientras
  // se armaba el carrito).
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [aliasCopied, setAliasCopied] = useState(false); // feedback transitorio del botón (1.4s)
  const [cvuCopied, setCvuCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastText, setToastText] = useState("Alias copiado");

  const successScheduledRef = useRef(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const CVU     = process.env.NEXT_PUBLIC_CVU     ?? "";
  const ALIAS   = process.env.NEXT_PUBLIC_ALIAS   ?? "";
  const TITULAR = process.env.NEXT_PUBLIC_TITULAR ?? "";
  const CUIT    = process.env.NEXT_PUBLIC_CUIT    ?? "";

  // v49: la fecha de retiro se muestra solo en "Tu pedido" con productos.
  const showDateRow = step === "form" && items.length > 0;

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const breadCount = items.reduce((sum, i) => sum + i.quantity, 0);

  // Lo que identifica al pedido ya creado: si el usuario vuelve atrás desde la
  // pantalla de pago y no cambia nada, "Pagar" reutiliza el mismo pedido en
  // vez de crear otro.
  function currentSignature() {
    const lines = items.map((i) => `${i.id}x${i.quantity}`).join(",");
    return `${slotId}|${name.trim()}|${phone.replace(/\D/g, "")}|${address.trim()}|${lines}`;
  }

  // Crea el pedido (pending) al tocar "Pagar", antes de mostrar los datos
  // bancarios: toda transferencia que llegue tiene un pedido para conciliar,
  // y si la fecha ya cerró se rechaza acá, antes de que la persona transfiera.
  async function createOrder(): Promise<number | null> {
    const signature = currentSignature();
    if (orderId != null && orderSignature === signature) return orderId;
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.replace(/\D/g, ""),
          customerAddress: isDelivery ? address.trim() : "",
          deliverySlotId: slotId,
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al procesar el pedido");
        return null;
      }
      setOrderId(data.orderId);
      setOrderTotal(typeof data.total === "number" ? data.total : null);
      setOrderSignature(signature);
      saveContact(name.trim(), phone.trim());
      return data.orderId;
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  // "Pagar": valida los datos, crea el pedido y pasa a la pantalla de transferencia.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (!name.trim() || !phone.trim()) { setError("Nombre y teléfono son requeridos"); return; }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) { setError("El teléfono debe tener entre 8 y 15 dígitos"); return; }
    if (isDelivery && !address.trim()) { setError("La dirección es requerida para delivery"); return; }
    const id = await createOrder();
    if (id != null) onAdvanceToPayment();
  }

  // Botón X (BRT-88): si hay productos en el carrito, confirma antes de
  // cerrar — en cualquiera de los dos pasos.
  function handleCloseClick() {
    if (items.length > 0) { setShowCloseConfirm(true); return; }
    onClose();
  }

  // Copia el alias — acción pasiva, no crea el pedido. El usuario se va
  // a pagar por su cuenta (app, home banking, lo que use) y vuelve.
  function showToast(text: string) {
    setToastText(text);
    setToastVisible(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 1600);
  }

  function handleCopyAlias() {
    navigator.clipboard?.writeText(ALIAS).catch(() => {});
    setAliasCopied(true);
    setTimeout(() => setAliasCopied(false), 1400);
    showToast("Alias copiado");
  }

  function handleCopyCvu() {
    navigator.clipboard?.writeText(CVU).catch(() => {});
    setCvuCopied(true);
    setTimeout(() => setCvuCopied(false), 1400);
    showToast("CVU copiado");
  }

  // "¡Listo!": el pedido ya existe (se creó con "Pagar"), acá solo se
  // pasa a la confirmación.
  function handleYaPague() {
    if (orderId == null || successScheduledRef.current) return;
    // Pantalla de pago alcanzada con "adelante" tras editar el carrito: el
    // pedido creado ya no coincide con lo que se ve.
    if (orderSignature !== currentSignature()) {
      setError("Tu pedido cambió. Volvé atrás y tocá Pagar de nuevo.");
      return;
    }
    successScheduledRef.current = true;
    setLoading(true);
    onSuccess(orderId);
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
        {/* Header — v46: "pedido" y "transferencia" en ámbar. v49: en "Tu pedido"
           la fila de fecha va arriba del título y un filete navy lo separa de la lista. */}
        <div className="px-5 min-[900px]:px-[30px]" style={{ paddingTop: showDateRow ? "14px" : "26px" }}>
          {showDateRow && <PickupDateRow date={slotDate} pickupTime={pickupTime} isDelivery={isDelivery} />}
          <div className="flex items-start justify-between gap-[14px]" style={{ marginTop: showDateRow ? "16px" : 0 }}>
            <h3 className="brot-h brot-h--modal">
              {step === "payment" ? (
                <>Pagá por<br /><span style={{ color: "#C8851A" }}>transferencia</span></>
              ) : (
                <span className="whitespace-nowrap">Tu <span style={{ color: "#C8851A" }}>pedido</span></span>
              )}
            </h3>
            <button
              onClick={handleCloseClick}
              aria-label="Cerrar"
              className="flex-none -mt-2 -mr-3 w-11 h-11 flex items-center justify-center border-none bg-transparent p-0"
              style={{ cursor: "pointer" }}
            >
              <CloseIcon />
            </button>
          </div>
          {showDateRow && <div className="brot-rule" style={{ marginTop: "18px" }} />}
        </div>

        {/* ── Pantalla de pago (step = payment) ── */}
        {step === "payment" ? (
          <div className="brot-cf-body flex flex-col flex-1 px-5 min-[900px]:px-[30px] pt-[6px] pb-6">
            {/* Total a transferir — ámbar, 56px/500, filete navy abajo */}
            <div className="brot-cf-tot text-center" style={{ marginTop: "auto", padding: "22px 0 20px", borderBottom: "1px solid #0E233C" }}>
              <div className="brot-mlabel" style={{ fontWeight: 500 }}>
                {orderId != null ? `Pedido #${orderId} · total a transferir` : "Total a transferir"}
              </div>
              <div className="brot-cf-tot-amount leading-none mt-[10px]" style={{ fontSize: "56px", fontWeight: 500, letterSpacing: "-.03em", color: "#C8851A", fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(orderTotal ?? total)}
              </div>
            </div>

            {/* Datos bancarios — orden: Titular, CUIT/CUIL, Alias, CVU. Copiar solo en Alias y CVU. */}
            <div className="brot-cf-data" style={{ marginTop: "6px" }}>
              {TITULAR && (
                <div className="flex items-center gap-2" style={{ padding: "10px 0", borderBottom: "1px solid rgba(14,35,60,.10)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>Titular</div>
                    <div className="text-[16px] text-navy mt-[2px] break-words">{TITULAR}</div>
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
              {ALIAS && (
                <div className="flex items-center gap-2" style={{ padding: "10px 0", borderBottom: CVU ? "1px solid rgba(14,35,60,.10)" : "none" }}>
                  <div className="flex-1 min-w-0">
                    <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>Alias</div>
                    <div className="text-[18px] text-navy mt-[2px] break-all">{ALIAS}</div>
                  </div>
                  <button type="button" onClick={handleCopyAlias} className="brot-ghost brot-ghost--xs">
                    {aliasCopied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              )}
              {CVU && (
                <div className="flex items-center gap-2" style={{ padding: "10px 0" }}>
                  <div className="flex-1 min-w-0">
                    <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>CVU</div>
                    <div className="text-[16px] text-navy mt-[2px] break-all" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: ".03em" }}>{CVU}</div>
                  </div>
                  <button type="button" onClick={handleCopyCvu} className="brot-ghost brot-ghost--xs">
                    {cvuCopied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              )}
              <p className="text-[15px] text-stone m-0 italic" style={{ marginTop: "14px" }}>
                Transferí desde tu banco o billetera y, cuando termines, tocá el botón de abajo.
              </p>
            </div>

            {/* ¡Listo!: lleva directo a la confirmación (el pedido ya existe). */}
            <div className="brot-cf-cta" style={{ marginTop: "auto", paddingTop: "22px" }}>
              <button
                type="button"
                onClick={handleYaPague}
                disabled={loading}
                className="brot-pill"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "¡Listo!"}
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-5 min-[900px]:px-[30px] pt-[2px] pb-6">
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
            {/* Resumen — v46: nombre + c/u | cápsula − cantidad + | subtotal */}
            <div className="brot-co-order-col">
              <div className="brot-co-summary">
                <div className="brot-co-lines">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="brot-co-line"
                      style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto 84px", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid rgba(14,35,60,.10)" }}
                    >
                      <div className="min-w-0">
                        <div className="text-[16px] text-navy">{item.name}</div>
                        <div className="whitespace-nowrap text-[12px] sm:text-[13px]" style={{ color: "#4A5463", fontVariantNumeric: "tabular-nums" }}>
                          {formatCurrency(item.price)} c/u{item.quantity >= MAX_PER_PRODUCT ? ` · máx. ${MAX_PER_PRODUCT}` : ""}
                        </div>
                      </div>
                      <QtyCapsule
                        value={item.quantity}
                        minusIsTrash={item.quantity === 1}
                        onMinus={() => (item.quantity === 1 ? onRemoveItem(item.id) : onChangeQuantity(item.id, item.quantity - 1))}
                        onPlus={() => onChangeQuantity(item.id, item.quantity + 1)}
                        plusDisabled={item.quantity >= MAX_PER_PRODUCT || (item.stock !== null && item.quantity >= item.stock)}
                      />
                      <span className="text-[16px] text-navy whitespace-nowrap text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="brot-co-total flex items-baseline justify-between gap-3">
                  <span className="brot-mlabel" style={{ color: "#0E233C", fontWeight: 500 }}>Total</span>
                  <span className="text-[22px] font-medium whitespace-nowrap" style={{ color: "#8A5A0E", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(total)}
                  </span>
                </div>
                {canAddMore && (
                  <button type="button" onClick={() => onClose()} className="brot-more">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M12 5v14"/></svg>
                    Sumar más panes
                  </button>
                )}
              </div>
            </div>

            {/* Tus datos — campos con rótulo interno (solo subrayado) */}
            <div className="brot-co-form" style={{ marginTop: "auto" }}>
              <div className="brot-co-datos-title">Tus datos</div>
              <div className="flex flex-col gap-[6px]" style={{ marginTop: "10px" }}>
                {[
                  { label: "Nombre y apellido", id: "name", type: "text", value: name, onChange: (v: string) => setName(v.replace(/[0-9]/g, "")), placeholder: "Juan Pérez", required: true },
                  { label: "Teléfono (WhatsApp)", id: "phone", type: "tel", value: phone, onChange: (v: string) => setPhone(v), placeholder: "11 1234-5678", required: true },
                  ...(isDelivery
                    ? [{ label: "Dirección de entrega", id: "address", type: "text", value: address, onChange: (v: string) => setAddress(v), placeholder: "Calle 1234, piso/depto, localidad", required: true }]
                    : []),
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
                type="submit"
                disabled={loading}
                className="brot-pill"
                style={{ flex: 1, minWidth: 0, padding: "0 14px", gap: "6px", whiteSpace: "nowrap" }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    Pagar
                    <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatCurrency(total)}</span>
                  </>
                )}
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
          {toastText}
        </div>
      )}

      {/* Aviso al cerrar con la X con panes elegidos (BRT-88; rediseñado en v55) */}
      {showCloseConfirm && (
        step === "payment" && orderId != null ? (
          // Con el pedido ya registrado (paso de pago) el aviso es otro: no se pierde
          // nada elegido, pero no se prepara hasta que llegue la transferencia.
          <ExitDialog
            title="¿Salir sin terminar?"
            body={`Tu pedido #${orderId} ya quedó registrado, pero no lo preparamos hasta que llegue la transferencia.`}
            stayLabel="Volver al pago"
            leaveLabel="Salir"
            onStay={() => setShowCloseConfirm(false)}
            onLeave={() => { setShowCloseConfirm(false); onClose(true); }}
          />
        ) : (
          <ExitDialog
            title="¿Salir sin terminar?"
            body={`${breadCount === 1 ? "Tenés 1 pan elegido" : `Tenés ${breadCount} panes elegidos`}. Si salís ahora, se borran y vas a tener que elegirlos de nuevo.`}
            stayLabel="Seguir eligiendo"
            leaveLabel="Salir y borrar el pedido"
            leaveLabelDesktop="Salir y borrar"
            onStay={() => setShowCloseConfirm(false)}
            onLeave={() => { setShowCloseConfirm(false); onClose(true); }}
          />
        )
      )}
    </div>
  );
}
