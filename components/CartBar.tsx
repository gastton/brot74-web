"use client";

import { ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CartBarProps {
  count: number;
  total: number;
  reserving: boolean;
  error: string;
  onCheckout: () => void;
}

const ctaTransition = "transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s";

// Barra de carrito única y persistente (BRT-89). Antes había dos
// implementaciones separadas de esto — una fija en page.tsx y otra
// metida dentro del scroll interno de ProductModal, que dejaba de estar
// anclada al leer una descripción larga. Ahora es un solo componente,
// montado una vez, visible tanto en la grilla como con ProductModal
// abierto (por eso el z-index queda por encima de ambos: z-50).
//
// BRT-92 (mobile-only): en mobile la barra de ancho completo se
// reemplaza por un botón flotante circular con badge de cantidad. Las
// dos versiones están montadas siempre; CSS decide cuál se ve según el
// ancho (md: 768px, mismo corte que ya usa la grilla de productos), así
// no hay parpadeo al cargar. Desktop no cambia.
export default function CartBar({ count, total, reserving, error, onCheckout }: CartBarProps) {
  return (
    <>
      {/* Desktop (md: 768px+) — barra de ancho completo, sin cambios */}
      <div
        className="hidden md:block fixed bottom-0 left-0 right-0 z-[60] p-4"
        style={{
          background: "linear-gradient(to top, #F9F5EC 60%, transparent)",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        }}
      >
        {error && (
          <div className="max-w-[430px] min-[900px]:max-w-[720px] mx-auto mb-2">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm text-center">
              {error}
            </div>
          </div>
        )}
        <div className="max-w-[430px] min-[900px]:max-w-[720px] mx-auto">
          <button
            onClick={onCheckout}
            disabled={reserving}
            className="w-full flex items-center gap-3 rounded-[16px] border-none"
            style={{
              background: "#0E233C",
              color: "#F9F5EC",
              padding: "14px 18px",
              cursor: "pointer",
              boxShadow: "0 8px 24px -8px rgba(14,35,60,.5)",
              transition: ctaTransition,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          >
            <span className="w-9 h-9 flex-none rounded-full flex items-center justify-center" style={{ border: "1px solid rgba(249,245,236,.38)" }}>
              <ShoppingCart size={18} color="#F9F5EC" strokeWidth={1.7} />
            </span>
            <span className="font-semibold text-[16px] whitespace-nowrap">
              {reserving ? "Reservando…" : `${count} producto${count !== 1 ? "s" : ""}`}
            </span>
            <span className="font-bold text-[18px] ml-auto whitespace-nowrap">{formatCurrency(total)}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F9F5EC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile (< 768px) — botón flotante circular con badge (BRT-92) */}
      <div
        className="md:hidden fixed z-[60]"
        style={{
          right: "18px",
          bottom: "calc(18px + env(safe-area-inset-bottom))",
        }}
      >
        {error && (
          <div className="absolute bottom-full right-0 mb-2 w-[220px]">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs text-center">
              {error}
            </div>
          </div>
        )}
        <button
          onClick={onCheckout}
          disabled={reserving}
          aria-label={`Ver pedido, ${count} producto${count !== 1 ? "s" : ""}, ${formatCurrency(total)}`}
          className="relative flex items-center justify-center rounded-full border-none"
          style={{
            width: "58px",
            height: "58px",
            background: "#0E233C",
            cursor: "pointer",
            boxShadow: "0 10px 24px -8px rgba(14,35,60,.55)",
            transition: ctaTransition,
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(.95)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          onTouchStart={(e) => { e.currentTarget.style.transform = "scale(.95)"; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = ""; }}
        >
          <ShoppingCart size={24} color="#F9F5EC" strokeWidth={1.7} />
          <span
            className="absolute flex items-center justify-center rounded-full font-bold"
            style={{
              top: "-4px",
              right: "-4px",
              minWidth: "22px",
              height: "22px",
              padding: "0 5px",
              fontSize: "12px",
              background: "#C8851A",
              color: "#F9F5EC",
              boxShadow: "0 2px 6px -1px rgba(14,35,60,.5)",
            }}
          >
            {reserving ? "…" : count}
          </span>
        </button>
      </div>
    </>
  );
}
