"use client";

import { useState } from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  weight: string;
  ingredients: string;
  imageUrl: string;
  focalX: number;
  focalY: number;
  stock: number | null;
  hasStock: boolean;
}

interface ProductModalProps {
  product: Product;
  quantity: number;
  slotSelected: boolean;
  cartCount: number;
  cartTotal: number;
  onAdd: () => void;
  onRemove: () => void;
  onConfirmQuantity: (quantity: number) => void;
  onClose: () => void;
  onCheckout: () => void;
}

function WheatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8851A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>
      <path d="M12 21V8"/>
      <path d="M12 8c0-2 1.4-3.4 3-4-.2 2-1.2 3.4-3 4Zm0 0c0-2-1.4-3.4-3-4 .2 2 1.2 3.4 3 4Z"/>
      <path d="M12 13c0-1.8 1.3-3 2.8-3.6-.2 1.8-1.1 3-2.8 3.6Zm0 0c0-1.8-1.3-3-2.8-3.6.2 1.8 1.1 3 2.8 3.6Z"/>
      <path d="M12 18c0-1.8 1.3-3 2.8-3.6-.2 1.8-1.1 3-2.8 3.6Zm0 0c0-1.8-1.3-3-2.8-3.6.2 1.8 1.1 3 2.8 3.6Z"/>
    </svg>
  );
}

const ctaTransition = "transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s";

export default function ProductModal({
  product,
  quantity,
  slotSelected,
  cartCount,
  cartTotal,
  onAdd,
  onRemove,
  onConfirmQuantity,
  onClose,
  onCheckout,
}: ProductModalProps) {
  const [descCollapsed, setDescCollapsed] = useState(true);

  // Cantidad elegida en mobile (BRT-89): se define ANTES de confirmar, no
  // después — arranca en lo que ya haya en el carrito (o 1 si es la primera
  // vez). El componente se remonta por producto (key en page.tsx), así que
  // este estado siempre arranca limpio al abrir un producto distinto.
  const [mobileQty, setMobileQty] = useState(() => Math.max(quantity, 1));

  // ── Desktop: stock/controles sin cambios (BRT-89 es mobile-only) ──
  const remaining = product.stock !== null ? product.stock - quantity : null;
  const isOutOfStock = !product.hasStock || (remaining !== null && remaining <= 0 && quantity === 0);
  const canAdd = slotSelected && !isOutOfStock && (remaining === null || remaining > 0);

  const stockColor =
    isOutOfStock          ? "#7C766A"
    : remaining === null  ? "#3F8F5B"
    : remaining >= 3      ? "#3F8F5B"
    : remaining > 0       ? "#C8851A"
    :                       "#D94F4F";

  const stockText = !slotSelected
    ? null
    : isOutOfStock
    ? "Sin stock"
    : remaining !== null
    ? `${remaining} disponible${remaining !== 1 ? "s" : ""}`
    : null;

  // ── Mobile: nada se descontó todavía (se elige antes de confirmar), así
  // que el stock se muestra contra el total disponible, no contra lo que
  // ya había en el carrito. ──
  const mobileOutOfStock = !product.hasStock || (product.stock !== null && product.stock <= 0);
  const mobileMaxReached = product.stock !== null && mobileQty >= product.stock;
  const mobileCanConfirm = slotSelected && !mobileOutOfStock;

  const mobileStockColor =
    mobileOutOfStock        ? "#7C766A"
    : product.stock === null ? "#3F8F5B"
    : product.stock >= 3     ? "#3F8F5B"
    : product.stock > 0      ? "#C8851A"
    :                          "#D94F4F";

  const mobileStockText = !slotSelected
    ? null
    : mobileOutOfStock
    ? "Sin stock"
    : product.stock !== null
    ? `${product.stock} disponible${product.stock !== 1 ? "s" : ""}`
    : null;

  return (
    <div className="brot-modal-backdrop fixed inset-0 z-50 flex justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(14,35,60,.58)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
        onClick={onClose}
      />

      {/* Modal — hoja de pantalla completa en mobile (un solo scroll, sin
         recorte flotante); en 900px+ vuelve a ser la tarjeta centrada de
         siempre (ver globals.css) (BRT-89) */}
      <div
        className="brot-modal-inner relative w-full overflow-hidden"
        style={{
          background: "#FBF7EF",
          boxShadow: "0 40px 80px -24px rgba(14,35,60,.6)",
          overflowY: "auto",
        }}
      >
        {/* Volver — desktop: flotando sobre la foto, sin cambios. Mobile:
           mismo lugar pero sólido/opaco (sin blur) — contraste garantizado
           sin importar la foto del producto (BRT-89). Las dos versiones
           están montadas siempre; CSS decide cuál se ve según el ancho,
           así no hay ningún parpadeo al abrir el modal. */}
        <button
          onClick={onClose}
          aria-label="Volver"
          className="brot-modal-back-desktop absolute top-[14px] left-[14px] z-10 w-[34px] h-[34px] rounded-full items-center justify-center"
          style={{
            background: "rgba(248,243,234,.85)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: "none",
            boxShadow: "0 3px 10px -4px rgba(0,0,0,.4)",
            cursor: "pointer",
            transition: "transform .15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="brot-modal-back-mobile absolute top-[14px] left-[14px] z-10 w-[34px] h-[34px] rounded-full items-center justify-center"
          style={{
            background: "#FBF7EF",
            border: "none",
            boxShadow: "0 3px 10px -4px rgba(0,0,0,.4)",
            cursor: "pointer",
            transition: "transform .15s",
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(.92)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        {/* Foto */}
        {product.imageUrl && (
          <div className="brot-modal-photo relative w-full overflow-hidden" style={{ height: "234px" }}>
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              style={{ objectPosition: `${product.focalX}% ${product.focalY}%` }}
              sizes="(min-width: 900px) 350px, 374px"
            />
          </div>
        )}

        {/* Cuerpo */}
        <div className="brot-modal-body px-6 pb-6 pt-[22px]">
          {/* Overline */}
          <div className="brot-modal-kicker flex items-center gap-[9px] mb-[14px]" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "#C8851A" }}>
            <span>Masa madre · Fermentación 18 h</span>
            <span style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(200,133,26,.4), rgba(200,133,26,0))" }} />
          </div>

          {/* Nombre + precio */}
          <div className="flex items-baseline justify-between gap-[14px]">
            <h3 className="font-extrabold text-[27px] text-navy m-0" style={{ letterSpacing: "-.015em", lineHeight: 1.1 }}>
              {product.name}
            </h3>
            <div className="font-bold text-[22px] whitespace-nowrap" style={{ color: "#C8851A" }}>
              {formatCurrency(product.price)}
            </div>
          </div>

          {/* Gramaje */}
          {product.weight && (
            <div className="font-semibold text-[13px] text-stone mt-[6px]" style={{ letterSpacing: ".02em" }}>{product.weight}</div>
          )}

          {/* Descripción */}
          {product.description && (
            <div className="mt-4">
              <p
                className={`brot-modal-desc text-[16px] text-[#3a4a5e] m-0${descCollapsed ? " is-collapsed" : ""}`}
                style={{
                  lineHeight: 1.6,
                  ...(descCollapsed ? {
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: "hidden",
                  } : {}),
                }}
              >
                {product.description}
              </p>
              <button
                type="button"
                aria-expanded={!descCollapsed}
                onClick={() => setDescCollapsed((c) => !c)}
                className="brot-modal-more inline-flex items-center gap-[6px] mt-[11px] border-none bg-transparent p-0 cursor-pointer font-bold text-[13.5px]"
                style={{ color: "#C8851A", letterSpacing: ".01em", alignSelf: "flex-start" }}
              >
                <span>{descCollapsed ? "Seguir leyendo" : "Ver menos"}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform .2s ease", transform: descCollapsed ? "" : "rotate(180deg)" }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>
          )}

          {/* Ingredientes */}
          {product.ingredients && (
            <div className="flex items-center gap-2 mt-4">
              <WheatIcon />
              <span
                className="text-[13.5px] text-stone"
                style={{ fontFamily: "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)", fontStyle: "italic" }}
              >
                {product.ingredients}
              </span>
            </div>
          )}

          {!slotSelected && (
            <p className="mt-4 text-[13px] font-medium text-stone bg-[#F4EEE2] rounded-xl px-4 py-3">
              Elegí una fecha de entrega para agregar al pedido
            </p>
          )}

          {/* Divisor */}
          <div className="brot-modal-rule" style={{ height: "1px", background: "rgba(14,35,60,.10)", marginTop: "22px" }} />

          {/* Pie: stock + controles */}
          <div className="brot-modal-foot flex flex-col gap-[14px] mt-[18px]">

          {/* Stock — desktop (sin cambios) */}
          {stockText && (
            <div className="brot-modal-stock-desktop items-center gap-2">
              {!isOutOfStock && (
                <span className="w-2 h-2 rounded-full flex-none" style={{ background: stockColor, boxShadow: "0 0 0 4px rgba(22,198,90,.16)" }} />
              )}
              <span className="font-semibold text-[13.5px] whitespace-nowrap" style={{ color: stockColor }}>
                {stockText}
              </span>
            </div>
          )}

          {/* Stock — mobile (contra el total disponible, nada se descontó
             todavía porque acá se elige la cantidad antes de confirmar) */}
          {mobileStockText && (
            <div className="brot-modal-stock-mobile items-center gap-2">
              {!mobileOutOfStock && (
                <span className="w-2 h-2 rounded-full flex-none" style={{ background: mobileStockColor, boxShadow: "0 0 0 4px rgba(22,198,90,.16)" }} />
              )}
              <span className="font-semibold text-[13.5px] whitespace-nowrap" style={{ color: mobileStockColor }}>
                {mobileStockText}
              </span>
            </div>
          )}

          {/* Controles — desktop (sin cambios): "Sumar este BROT" y, una
             vez agregado, stepper + subtotal, con el modal quedándose
             abierto. */}
          {slotSelected && (
            <div className="brot-modal-controls-desktop">
              {quantity === 0 ? (
                <button
                  onClick={onAdd}
                  disabled={!canAdd}
                  className="brot-modal-cta w-full font-bold text-[15.5px] tracking-[.01em] py-4 rounded-[14px] border-none"
                  style={{
                    background: "#0E233C",
                    color: "#F4EEE2",
                    opacity: canAdd ? 1 : 0.4,
                    cursor: canAdd ? "pointer" : "not-allowed",
                    transition: ctaTransition,
                  }}
                  onMouseEnter={(e) => { if (canAdd) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 30px -16px rgba(14,35,60,.55)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  {canAdd ? "Sumar este BROT" : "No disponible"}
                </button>
              ) : (
                /* Stepper + subtotal */
                <div className="flex items-center justify-between gap-[14px]">
                  {/* Stepper */}
                  <div
                    className="inline-flex items-center gap-1"
                    style={{
                      background: "#F4EEE2",
                      border: "1.5px solid rgba(14,35,60,.16)",
                      borderRadius: "14px",
                      padding: "5px",
                    }}
                  >
                    <button
                      onClick={onRemove}
                      aria-label="Restar"
                      className="flex items-center justify-center rounded-full border-none"
                      style={{
                        width: "44px",
                        height: "44px",
                        background: "#FBF7EF",
                        color: "#0E233C",
                        cursor: "pointer",
                        transition: "transform .12s",
                      }}
                      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(.9)"; }}
                      onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14"/></svg>
                    </button>
                    <span
                      className="font-bold text-[20px] text-navy text-center"
                      style={{ minWidth: "40px" }}
                    >
                      {quantity}
                    </span>
                    <button
                      onClick={onAdd}
                      disabled={!canAdd}
                      aria-label="Sumar"
                      className="flex items-center justify-center rounded-full border-none"
                      style={{
                        width: "44px",
                        height: "44px",
                        background: "#0E233C",
                        color: "#F4EEE2",
                        cursor: canAdd ? "pointer" : "not-allowed",
                        opacity: canAdd ? 1 : 0.35,
                        transition: "transform .12s, opacity .15s",
                      }}
                      onMouseDown={(e) => { if (canAdd) e.currentTarget.style.transform = "scale(.9)"; }}
                      onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M12 5v14"/></svg>
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <div className="font-medium text-[13px] text-stone">Subtotal</div>
                    <div className="font-bold text-[20px] text-navy mt-0.5">
                      {formatCurrency(product.price * quantity)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Controles — mobile (BRT-89): la cantidad se elige ANTES de
             confirmar con un stepper siempre visible, y un solo botón
             suma esa cantidad Y cierra el modal — inspirado en el flujo
             de "elegir cantidad → confirmar → volver al listado" de la
             referencia (sin copiar su estilo). */}
          {slotSelected && (
            <div className="brot-modal-controls-mobile flex-col gap-[14px]">
              <div
                className="w-full flex items-center justify-between"
                style={{ background: "#F4EEE2", border: "1.5px solid rgba(14,35,60,.16)", borderRadius: "14px", padding: "5px" }}
              >
                <button
                  type="button"
                  onClick={() => setMobileQty((q) => Math.max(1, q - 1))}
                  disabled={mobileQty <= 1}
                  aria-label="Restar cantidad"
                  className="flex items-center justify-center rounded-full border-none"
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "#FBF7EF",
                    color: "#0E233C",
                    cursor: mobileQty <= 1 ? "not-allowed" : "pointer",
                    opacity: mobileQty <= 1 ? 0.4 : 1,
                    transition: "transform .12s, opacity .15s",
                  }}
                  onMouseDown={(e) => { if (mobileQty > 1) e.currentTarget.style.transform = "scale(.9)"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14"/></svg>
                </button>
                <span className="font-bold text-[20px] text-navy text-center" style={{ minWidth: "40px" }}>
                  {mobileQty}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileQty((q) => (product.stock !== null ? Math.min(product.stock, q + 1) : q + 1))}
                  disabled={mobileOutOfStock || mobileMaxReached}
                  aria-label="Sumar cantidad"
                  className="flex items-center justify-center rounded-full border-none"
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "#0E233C",
                    color: "#F4EEE2",
                    cursor: (mobileOutOfStock || mobileMaxReached) ? "not-allowed" : "pointer",
                    opacity: (mobileOutOfStock || mobileMaxReached) ? 0.35 : 1,
                    transition: "transform .12s, opacity .15s",
                  }}
                  onMouseDown={(e) => { if (!mobileOutOfStock && !mobileMaxReached) e.currentTarget.style.transform = "scale(.9)"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M12 5v14"/></svg>
                </button>
              </div>

              <button
                type="button"
                onClick={() => { onConfirmQuantity(mobileQty); onClose(); }}
                disabled={!mobileCanConfirm}
                className="w-full font-bold text-[15.5px] tracking-[.01em] py-4 rounded-[14px] border-none"
                style={{
                  background: "#0E233C",
                  color: "#F4EEE2",
                  opacity: mobileCanConfirm ? 1 : 0.4,
                  cursor: mobileCanConfirm ? "pointer" : "not-allowed",
                  transition: ctaTransition,
                }}
                onMouseEnter={(e) => { if (mobileCanConfirm) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 30px -16px rgba(14,35,60,.55)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                {mobileCanConfirm ? `Sumar ${mobileQty} · ${formatCurrency(product.price * mobileQty)}` : "No disponible"}
              </button>
            </div>
          )}

          </div>{/* /brot-modal-foot */}

          {/* Barra de carrito — solo desktop (BRT-89: en mobile ya no
             aplica — el nuevo flujo mobile confirma y cierra en un solo
             paso, sin quedarse navegando con el carrito a la vista, igual
             que en la referencia. El layout de desktop no cambia). */}
          {cartCount > 0 && (
            <button
              onClick={onCheckout}
              className="brot-modal-desktop-bar flex items-center gap-3 w-full mt-5 rounded-[16px] border-none"
              style={{
                background: "#0E233C",
                color: "#F4EEE2",
                padding: "14px 18px",
                cursor: "pointer",
                transition: ctaTransition,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
            >
              <span
                className="w-9 h-9 flex-none rounded-full flex items-center justify-center"
                style={{ border: "1px solid rgba(244,238,226,.38)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4EEE2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>
                </svg>
              </span>
              <span className="font-semibold text-[16px] whitespace-nowrap">
                {cartCount} producto{cartCount !== 1 ? "s" : ""}
              </span>
              <span className="font-bold text-[18px] ml-auto whitespace-nowrap">
                {formatCurrency(cartTotal)}
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4EEE2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
