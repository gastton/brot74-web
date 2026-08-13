"use client";

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
export default function CartBar({ count, total, reserving, error, onCheckout }: CartBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] p-4"
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F9F5EC" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>
            </svg>
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
  );
}
