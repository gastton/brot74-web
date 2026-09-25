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
//
// BRT-92 (mobile-only): en mobile la barra de ancho completo se
// reemplaza por un botón flotante circular con badge de cantidad. Las
// dos versiones están montadas siempre; CSS decide cuál se ve según el
// ancho (md: 768px, mismo corte que ya usa la grilla de productos), así
// no hay parpadeo al cargar. Desktop no cambia.
function CountPill({ count, reserving }: { count: number; reserving: boolean }) {
  return (
    <span
      className="flex-none flex items-center justify-center"
      style={{
        minWidth: "28px",
        height: "28px",
        padding: "0 7px",
        borderRadius: "14px",
        background: "#C8851A",
        color: "#0E233C",
        fontSize: "15px",
        fontWeight: 600,
      }}
    >
      {reserving ? "…" : count}
    </span>
  );
}

// v40: la barra pasa a "Ver mi pedido" + total en ambos breakpoints (antes
// desktop mostraba "N productos" en versalitas y mobile era un botón
// flotante circular sin texto — ninguno de los dos comunicaba el total
// de un vistazo). Referencia: pantallas 2 y 7 de pedidos-estandares.html.
export default function CartBar({ count, total, reserving, error, onCheckout }: CartBarProps) {
  return (
    <>
      {/* Desktop (md: 768px+) — barra de ancho completo */}
      <div
        className="hidden md:block fixed bottom-0 left-0 right-0 z-[60] p-4"
        style={{
          background: "linear-gradient(to top, #F4EEE2 60%, transparent)",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        }}
      >
        {error && (
          <div className="max-w-[430px] min-[900px]:max-w-[720px] mx-auto mb-2">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-[4px] px-4 py-2 text-sm text-center">
              {error}
            </div>
          </div>
        )}
        <div className="max-w-[430px] min-[900px]:max-w-[720px] mx-auto">
          <button
            onClick={onCheckout}
            disabled={reserving}
            aria-label={`Ver mi pedido, ${count} producto${count !== 1 ? "s" : ""}, ${formatCurrency(total)}`}
            className="w-full flex items-center gap-3 rounded-[4px] border-none font-medium text-[16px]"
            style={{
              background: "#0E233C",
              color: "#F4EEE2",
              minHeight: "56px",
              padding: "0 18px",
              letterSpacing: ".01em",
              cursor: "pointer",
              boxShadow: "0 8px 24px -8px rgba(14,35,60,.5)",
              transition: ctaTransition,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          >
            <CountPill count={count} reserving={reserving} />
            <span className="whitespace-nowrap">Ver mi pedido</span>
            <span className="ml-auto whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(total)}</span>
          </button>
        </div>
      </div>

      {/* Mobile (< 768px) — v40: barra de ancho completo (antes botón flotante circular sin texto) */}
      <div
        className="md:hidden fixed left-0 right-0 z-[60] px-4"
        style={{
          bottom: "calc(20px + env(safe-area-inset-bottom))",
        }}
      >
        {error && (
          <div className="mb-2">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-[4px] px-3 py-2 text-sm text-center">
              {error}
            </div>
          </div>
        )}
        <button
          onClick={onCheckout}
          disabled={reserving}
          aria-label={`Ver mi pedido, ${count} producto${count !== 1 ? "s" : ""}, ${formatCurrency(total)}`}
          className="w-full flex items-center gap-3 rounded-[4px] border-none font-medium text-[16px]"
          style={{
            background: "#0E233C",
            color: "#F4EEE2",
            minHeight: "56px",
            padding: "0 18px",
            letterSpacing: ".01em",
            cursor: "pointer",
            boxShadow: "0 10px 24px -8px rgba(14,35,60,.55)",
            transition: ctaTransition,
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(.98)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          onTouchStart={(e) => { e.currentTarget.style.transform = "scale(.98)"; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = ""; }}
        >
          <CountPill count={count} reserving={reserving} />
          <span className="whitespace-nowrap">Ver mi pedido</span>
          <span className="ml-auto whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(total)}</span>
        </button>
      </div>
    </>
  );
}
