"use client";

import { useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import ImageZoomModal from "./ImageZoomModal";

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
  const [showZoom, setShowZoom] = useState(false); // BRT-93

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
    isOutOfStock          ? "#4A5463"
    : remaining === null  ? "#2F6B44"
    : remaining >= 3      ? "#2F6B44"
    : remaining > 0       ? "#8A5A0E"
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
    mobileOutOfStock        ? "#4A5463"
    : product.stock === null ? "#2F6B44"
    : product.stock >= 3     ? "#2F6B44"
    : product.stock > 0      ? "#8A5A0E"
    :                          "#D94F4F";

  const mobileStockText = !slotSelected
    ? null
    : mobileOutOfStock
    ? "Sin stock"
    : product.stock !== null
    ? `${product.stock} disponible${product.stock !== 1 ? "s" : ""}`
    : null;

  return (
    <>
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
          background: "#fff",
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
          className="brot-modal-back-desktop brot-tap absolute top-[14px] left-[14px] z-10 rounded-full items-center justify-center"
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
          className="brot-modal-back-mobile brot-tap absolute top-[14px] left-[14px] z-10 rounded-full items-center justify-center"
          style={{
            background: "#fff",
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

        {/* Foto — click en cualquier parte abre la imagen a pantalla
           completa (BRT-93), con una lupa en la esquina como pista visual */}
        {product.imageUrl && (
          <div
            className="brot-modal-photo relative w-full overflow-hidden"
            style={{ height: "330px", cursor: "pointer" }}
            onClick={() => setShowZoom(true)}
          >
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              style={{ objectPosition: `${product.focalX}% ${product.focalY}%` }}
              sizes="(min-width: 900px) 350px, 374px"
            />
            <span
              className="absolute bottom-[10px] right-[10px] z-10 w-[34px] h-[34px] rounded-full flex items-center justify-center"
              style={{
                background: "rgba(248,243,234,.85)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                boxShadow: "0 3px 10px -4px rgba(0,0,0,.4)",
              }}
            >
              <Search size={16} color="#0E233C" strokeWidth={2.2} />
            </span>
          </div>
        )}

        {/* Cuerpo */}
        <div className="brot-modal-body px-6 pb-6 pt-[22px]">
          {/* Overline */}
          <div className="brot-modal-kicker mb-[10px]" style={{ fontSize: "12px", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#8A5A0E" }}>
            Masa madre · Fermentación 18 h
          </div>

          {/* Nombre + precio */}
          <div className="flex items-baseline justify-between gap-[14px]">
            <h3 className="font-normal text-[32px] text-navy m-0" style={{ letterSpacing: "-.02em", lineHeight: 1.02 }}>
              {product.name}
            </h3>
            <div className="font-medium text-[20px] whitespace-nowrap" style={{ color: "#8A5A0E", fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(product.price)}
            </div>
          </div>

          {/* Gramaje */}
          {product.weight && (
            <div className="brot-mlabel mt-[6px]">{product.weight}</div>
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
                className="brot-modal-more inline-flex items-center gap-[6px] mt-[11px] border-none bg-transparent p-0 cursor-pointer font-medium text-[15px]"
                style={{ color: "#8A5A0E", letterSpacing: ".01em", alignSelf: "flex-start" }}
              >
                <span>{descCollapsed ? "Seguir leyendo" : "Ver menos"}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform .2s ease", transform: descCollapsed ? "" : "rotate(180deg)" }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>
          )}

          {/* Ingredientes — v40: texto con rótulo, no línea gris al lado de un ícono */}
          {product.ingredients && (
            <p className="text-[15px] text-stone mt-4 mb-0" style={{ lineHeight: 1.45 }}>
              <span className="font-medium text-navy">Ingredientes: </span>
              {product.ingredients}
            </p>
          )}

          {!slotSelected && (
            <p className="mt-4 text-[15px] font-medium text-stone bg-[#F4EEE2] rounded-[4px] px-4 py-3">
              Elegí una fecha de entrega para agregar al pedido
            </p>
          )}

          {/* Divisor */}
          <div className="brot-modal-rule" style={{ height: "1px", background: "#0E233C", marginTop: "16px" }} />

          {/* Pie: stock + controles */}
          <div className="brot-modal-foot flex flex-col gap-[14px] mt-[14px]">

          {/* Stock — desktop (sin cambios) */}
          {stockText && (
            <div className="brot-modal-stock-desktop items-center gap-2">
              {!isOutOfStock && (
                <span className="w-2 h-2 rounded-full flex-none" style={{ background: stockColor }} />
              )}
              <span className="font-medium text-[16px] whitespace-nowrap" style={{ color: stockColor }}>
                {stockText}
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
                  className="brot-modal-cta brot-pill"
                >
                  {canAdd ? "Sumar este BROT" : "No disponible"}
                </button>
              ) : (
                /* Stepper + subtotal — v37: sin recuadro, "−" con hairline (BRT-181) */
                <div className="flex items-center justify-between gap-[14px]">
                  {/* Stepper */}
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={onRemove}
                      aria-label="Restar"
                      className="brot-step flex items-center justify-center rounded-full"
                      style={{
                        background: "transparent",
                        border: "var(--brot-hair)",
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
                      className="brot-step flex items-center justify-center rounded-full border-none"
                      style={{
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
                    <div className="brot-mlabel">Subtotal</div>
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
            <div className="brot-modal-controls-mobile flex-1 flex-col gap-[14px]">
              {/* v40: stepper a 44px con borde navy (antes 34px y hairline) */}
              <div className="w-full flex items-center justify-between">
                {mobileStockText && (
                  <span className="font-medium text-[16px] whitespace-nowrap" style={{ color: mobileStockColor }}>
                    {mobileStockText}
                  </span>
                )}
                <div className="inline-flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      // BRT-96: en cantidad 1, "−" ya no se limita a clampear el
                      // stepper local — si el producto YA está en el carrito
                      // (quantity > 0), lo saca del carrito de una, igual que
                      // hace el "−" de desktop con onRemove. Si nunca se agregó
                      // (quantity === 0, mobileQty arranca en 1 igual) no hay
                      // nada que sacar, así que ahí el botón sigue deshabilitado.
                      if (mobileQty <= 1) {
                        if (quantity > 0) { onRemove(); onClose(); }
                        return;
                      }
                      setMobileQty((q) => q - 1);
                    }}
                    disabled={mobileQty <= 1 && quantity === 0}
                    aria-label="Restar cantidad"
                    className="brot-step flex items-center justify-center rounded-full"
                    style={{
                      background: "transparent",
                      border: "1.5px solid #0E233C",
                      color: "#0E233C",
                      cursor: mobileQty <= 1 && quantity === 0 ? "not-allowed" : "pointer",
                      opacity: mobileQty <= 1 && quantity === 0 ? 0.4 : 1,
                      transition: "transform .12s, opacity .15s",
                    }}
                    onMouseDown={(e) => { if (mobileQty > 1 || quantity > 0) e.currentTarget.style.transform = "scale(.9)"; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14"/></svg>
                  </button>
                  <span className="font-normal text-[22px] text-navy text-center" style={{ minWidth: "16px" }}>
                    {mobileQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileQty((q) => (product.stock !== null ? Math.min(product.stock, q + 1) : q + 1))}
                    disabled={mobileOutOfStock || mobileMaxReached}
                    aria-label="Sumar cantidad"
                    className="brot-step flex items-center justify-center rounded-full border-none"
                    style={{
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M12 5v14"/></svg>
                  </button>
                </div>
              </div>

              {/* v37: CTA anclado al pie de la pantalla (BRT-181). */}
              <button
                type="button"
                onClick={() => { onConfirmQuantity(mobileQty); onClose(); }}
                disabled={!mobileCanConfirm}
                className="brot-pill mt-auto"
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
              className="brot-modal-desktop-bar brot-pill mt-5"
              style={{ justifyContent: "flex-start" }}
            >
              <span
                className="flex-none flex items-center justify-center"
                style={{ minWidth: "28px", height: "28px", padding: "0 7px", borderRadius: "14px", background: "#C8851A", color: "#0E233C", fontSize: "15px", fontWeight: 600 }}
              >
                {cartCount}
              </span>
              <span className="whitespace-nowrap">Ver mi pedido</span>
              <span className="ml-auto whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(cartTotal)}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Zoom de la foto a pantalla completa (BRT-93) — reutiliza el mismo
       componente que ya usa el admin, sin cambiarle su función de zoom. */}
    {showZoom && product.imageUrl && (
      <ImageZoomModal
        src={product.imageUrl}
        alt={product.name}
        onClose={() => setShowZoom(false)}
      />
    )}
    </>
  );
}
