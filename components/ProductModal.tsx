"use client";

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
  onClose,
  onCheckout,
}: ProductModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[28px]">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(14,35,60,.58)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="brot-modal-inner relative w-full overflow-hidden"
        style={{
          maxWidth: "374px",
          background: "#FBF7EF",
          borderRadius: "22px",
          boxShadow: "0 40px 80px -24px rgba(14,35,60,.6)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Cerrar */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-[14px] right-[14px] z-10 w-[34px] h-[34px] rounded-full flex items-center justify-center"
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18"/>
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
          {/* Nombre + precio */}
          <div className="flex items-baseline justify-between gap-[14px]">
            <h3 className="font-bold text-[26px] tracking-[-0.01em] text-navy m-0" style={{ lineHeight: 1.1 }}>
              {product.name}
            </h3>
            <div className="font-bold text-[22px] whitespace-nowrap" style={{ color: "#C8851A" }}>
              {formatCurrency(product.price)}
            </div>
          </div>

          {/* Gramaje */}
          {product.weight && (
            <div className="font-medium text-[13.5px] text-stone mt-[3px]">{product.weight}</div>
          )}

          {/* Descripción */}
          {product.description && (
            <p
              className="text-[16px] leading-[1.55] mt-4"
              style={{ fontFamily: "var(--font-newsreader, 'Newsreader', Georgia, serif)", color: "#3a4a5e" }}
            >
              {product.description}
            </p>
          )}

          {/* Ingredientes */}
          {product.ingredients && (
            <div className="flex items-center gap-2 mt-4">
              <WheatIcon />
              <span
                className="text-[13.5px] text-stone"
                style={{ fontFamily: "var(--font-newsreader, 'Newsreader', Georgia, serif)", fontStyle: "italic" }}
              >
                {product.ingredients}
              </span>
            </div>
          )}

          {/* Stock */}
          {stockText && (
            <div className="flex items-center gap-2 mt-[18px]">
              {!isOutOfStock && (
                <span className="w-[7px] h-[7px] rounded-full flex-none" style={{ background: stockColor }} />
              )}
              <span
                className="font-semibold text-[13.5px] whitespace-nowrap"
                style={{ color: stockColor }}
              >
                {stockText}
              </span>
            </div>
          )}

          {!slotSelected && (
            <p className="mt-4 text-[13px] font-medium text-stone bg-[#F4EEE2] rounded-xl px-4 py-3">
              Elegí una fecha de entrega para agregar al pedido
            </p>
          )}

          {/* Controles */}
          {slotSelected && (
            <>
              {quantity === 0 ? (
                <button
                  onClick={onAdd}
                  disabled={!canAdd}
                  className="mt-[18px] w-full font-bold text-[15.5px] tracking-[.01em] py-4 rounded-[14px] border-none"
                  style={{
                    background: canAdd ? "#0E233C" : "#0E233C",
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
                <div className="flex items-center justify-between gap-[14px] mt-[18px]">
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
                        background: canAdd ? "#0E233C" : "#0E233C",
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
            </>
          )}

          {/* Barra de carrito */}
          {cartCount > 0 && (
            <button
              onClick={onCheckout}
              className="flex items-center gap-3 w-full mt-5 rounded-[16px] border-none"
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
