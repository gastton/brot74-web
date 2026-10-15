"use client";

import PriceTag from "./PriceTag";
import { MAX_PER_PRODUCT } from "@/lib/cartItems";

interface ProductCardProps {
  id: number;
  name: string;
  description: string;
  price: number;
  discountPrice: number | null;
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
  discountPrice,
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
  const stockReached = remaining !== null && remaining <= 0;
  const maxReached = quantity >= MAX_PER_PRODUCT;
  const limitReached = stockReached || maxReached;

  const textColor = outOfStock ? "#4A5463" : "#0E233C";
  const priceColor = outOfStock ? "#4A5463" : "#8A5A0E";

  // v45 · editorial: sin tarjeta ni radio. Mobile: foto 4:5 a la izquierda e
  // info a la derecha, separadas por filetes. Desktop: foto 4:3 arriba con
  // filete navy debajo y nombre + precio en una fila.
  return (
    <div
      onClick={() => { if (!isDisabled) onClick(); }}
      className="brot-card grid grid-cols-[104px_minmax(0,1fr)] gap-4 py-[14px] border-t border-[rgba(14,35,60,.16)] md:block md:py-0 md:border-t-0"
      style={{ cursor: isDisabled ? "default" : "pointer" }}
    >
      {/* Foto — la atenuación de "agotado" queda solo en la foto */}
      <div
        className="relative overflow-hidden aspect-[4/5] md:aspect-[4/3]"
        style={{ background: "#ddd6c8" }}
      >
        {imageUrl ? (
          <div
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: `${focalX}% ${focalY}%`,
              transform: `scale(${imageScale})`,
              transformOrigin: `${focalX}% ${focalY}%`,
              filter: outOfStock ? "grayscale(.9)" : "none",
              opacity: outOfStock ? 0.5 : 1,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[#ddd6c8]" />
        )}
      </div>

      {/* Texto */}
      <div className="min-w-0 md:border-t md:border-navy md:mt-[14px] md:pt-3">
        <div className="md:flex md:items-baseline md:justify-between md:gap-3">
          <div className="text-[20px] font-medium leading-[1.15]" style={{ letterSpacing: "-.01em", color: textColor }}>
            {name}
          </div>
          {/* Wrapper con hidden/md:block: PriceTag ya fija su propio display (inline-flex),
             y "hidden md:inline-flex" directo sobre él quedaba pisado por ese inline-flex. */}
          <div className="hidden md:block flex-none">
            <PriceTag price={price} discountPrice={discountPrice} size={18} oldSize={15} color={priceColor} />
          </div>
        </div>

        {/* Precio (mobile) — v52: sin gramaje en la card */}
        <div className="flex flex-wrap items-baseline gap-x-[10px] md:hidden">
          <PriceTag price={price} discountPrice={discountPrice} size={17} oldSize={14} color={priceColor} />
        </div>

        {/* Descripción — solo mobile, recortada a 3 líneas (BRT-92) */}
        {description && (
          <div className="md:hidden">
            <p
              className="text-[15px] text-stone mt-1 leading-[1.4]"
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

        {outOfStock && (
          <div className="brot-kick mt-3">Sin stock esta fecha</div>
        )}

        {/* Agregar (BRT-89/117): suma 1 unidad sin abrir el modal. Deshabilitado
           al llegar al límite de stock; con cantidad > 0 pasa a píldora llena. */}
        {!isDisabled && (
          <button
            type="button"
            aria-label={`Agregar ${name}`}
            aria-disabled={limitReached}
            disabled={limitReached}
            onClick={(e) => { e.stopPropagation(); if (!limitReached) onQuickAdd(); }}
            className={`brot-ghost brot-ghost--sm mt-[10px]${quantity > 0 ? " brot-ghost--on" : ""}`}
          >
            {quantity > 0 ? (
              <>En tu pedido · {quantity}</>
            ) : (
              <>
                <span className="md:hidden">Agregar</span>
                <span className="hidden md:inline">Sumar</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M5 12h14M12 5v14"/>
                </svg>
              </>
            )}
          </button>
        )}
        {!isDisabled && maxReached && !stockReached && (
          <div className="text-[13px] text-stone mt-1">Máximo {MAX_PER_PRODUCT} por pan</div>
        )}
      </div>
    </div>
  );
}
