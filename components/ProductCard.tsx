"use client";

import { formatCurrency } from "@/lib/utils";

interface ProductCardProps {
  id: number;
  name: string;
  description: string;
  price: number;
  weight: string;
  ingredients: string;
  imageUrl: string;
  focalX: number;
  focalY: number;
  imageScale: number;
  stock: number | null;
  hasStock: boolean;
  quantity: number;
  slotSelected: boolean;
  onClick: () => void;
  onQuickAdd: () => void;
}

export default function ProductCard({
  name,
  description,
  price,
  weight,
  imageUrl,
  focalX,
  focalY,
  imageScale,
  stock,
  hasStock,
  quantity,
  slotSelected,
  onClick,
  onQuickAdd,
}: ProductCardProps) {
  const remaining = stock !== null ? stock - quantity : null;
  const outOfStock = slotSelected && !hasStock && stock !== null && stock <= 0;
  const isDisabled = !slotSelected || outOfStock;
  // BRT-117: además del caso "sin stock para nadie" (outOfStock), el "+" de
  // quick-add tiene que respetar lo que ya hay en el carrito — mismo límite
  // que ya usa el "+" del modal de detalle (ver ProductModal canAdd).
  const limitReached = remaining !== null && remaining <= 0;

  return (
    <div
      onClick={() => { if (!isDisabled) onClick(); }}
      className="flex flex-row-reverse gap-3 pb-4 mb-3 border-b border-[rgba(14,35,60,.10)] md:flex-col md:gap-0 md:pb-0 md:mb-0 md:border-none"
      style={{
        cursor: isDisabled ? "default" : "pointer",
        transition: "transform .18s cubic-bezier(.2,.7,.3,1)",
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
      }}
    >
      {/* Foto — mobile: miniatura fija a la derecha (BRT-92). Desktop: sin
         cambios, cuadrada a todo el ancho de la card. */}
      <div
        className="relative overflow-hidden flex-none w-[104px] h-[104px] md:w-full md:h-auto md:aspect-square"
        style={{
          borderRadius: "16px",
          background: "#ddd6c8",
          border: "1px solid rgba(14,35,60,.08)",
          boxShadow: isDisabled ? "none" : "0 16px 28px -22px rgba(14,35,60,.45)",
        }}
      >
        {imageUrl ? (
          <div
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: `${focalX}% ${focalY}%`,
              transform: `scale(${imageScale})`,
              transformOrigin: `${focalX}% ${focalY}%`,
              transition: "transform .3s cubic-bezier(.2,.7,.3,1)",
              filter: outOfStock ? "grayscale(.85) brightness(1.04)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) e.currentTarget.style.transform = `scale(${Math.max(imageScale, 1) * 1.04})`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = `scale(${imageScale})`;
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[#ddd6c8]" />
        )}

        {/* Velo sin stock */}
        {outOfStock && (
          <div className="absolute inset-0" style={{ background: "rgba(249,245,236,.5)" }} />
        )}

        {/* Badge sin stock */}
        {outOfStock && (
          <span
            className="absolute top-3 left-3 font-bold text-[11.5px] tracking-[.04em] px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{
              background: "rgba(248,243,234,.78)",
              backdropFilter: "blur(5px)",
              WebkitBackdropFilter: "blur(5px)",
              color: "#7C766A",
              boxShadow: "0 3px 10px -5px rgba(0,0,0,.35)",
            }}
          >
            Sin stock
          </span>
        )}

        {/* Badge cantidad en carrito */}
        {quantity > 0 && !outOfStock && (
          <div
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "#0E233C", color: "#F9F5EC", boxShadow: "0 2px 8px rgba(14,35,60,.4)" }}
          >
            {quantity}
          </div>
        )}

        {/* Badge últimas unidades */}
        {slotSelected && remaining !== null && remaining <= 2 && remaining > 0 && (
          <div
            className="absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "#C8851A", color: "#F9F5EC" }}
          >
            Últimos {remaining}
          </div>
        )}

        {/* Quick-add (BRT-89): suma 1 unidad sin abrir el modal de producto.
           Mismo lenguaje visual que el botón "Volver" de ProductModal. Sigue
           visible cuando se llega al límite (BRT-117) —igual que el modal—
           pero deshabilitado, para que quede claro que ya no se puede sumar
           más sin tener que abrir el modal para verlo. */}
        {!isDisabled && (
          <button
            type="button"
            aria-label={`Agregar ${name}`}
            aria-disabled={limitReached}
            disabled={limitReached}
            onClick={(e) => { e.stopPropagation(); if (!limitReached) onQuickAdd(); }}
            className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center border-none"
            style={{
              background: "rgba(248,243,234,.9)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              boxShadow: "0 3px 10px -4px rgba(0,0,0,.4)",
              cursor: limitReached ? "not-allowed" : "pointer",
              opacity: limitReached ? 0.45 : 1,
              transition: "transform .15s, opacity .15s",
            }}
            onMouseDown={(e) => { if (!limitReached) e.currentTarget.style.transform = "scale(.9)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="2.4" strokeLinecap="round">
              <path d="M5 12h14M12 5v14"/>
            </svg>
          </button>
        )}
      </div>

      {/* Texto */}
      <div
        className="pt-3 px-0.5 flex-1 min-w-0 md:pt-3"
        style={{ opacity: outOfStock ? 0.5 : 1 }}
      >
        <div className="font-semibold text-[16.5px] text-navy leading-snug">{name}</div>

        {/* Peso — solo desktop, como siempre (BRT-92: mobile no lo muestra,
           en su lugar va la descripción). */}
        {weight && (
          <div className="hidden md:block font-medium text-[12.5px] text-stone mt-0.5">{weight}</div>
        )}

        <div className="font-bold text-[15.5px] mt-2" style={{ color: "#C8851A" }}>
          {formatCurrency(price)}
        </div>

        {/* Descripción — solo mobile, recortada a 3 líneas (BRT-92). El
           contenedor controla mostrar/ocultar por breakpoint; el <p> de
           adentro tiene su propio "display" fijo (line-clamp), así que no
           puede ser el mismo elemento el que se oculta con una clase —
           un style inline siempre le gana a una clase de Tailwind. */}
        {description && (
          <div className="md:hidden">
            <p
              className="text-[13px] text-stone mt-1.5 leading-snug"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }}
            >
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
