"use client";

import { formatCurrency } from "@/lib/utils";

interface CartBarProps {
  count: number;
  total: number;
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
function CountPill({ count }: { count: number }) {
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
      {count}
    </span>
  );
}

// v40: la barra pasa a "Ver mi pedido" + total en ambos breakpoints (antes
// desktop mostraba "N productos" en versalitas y mobile era un botón
// flotante circular sin texto — ninguno de los dos comunicaba el total
// de un vistazo). Referencia: pantallas 2 y 7 de pedidos-estandares.html.
export default function CartBar({ count, total, onCheckout }: CartBarProps) {
  return (
    <>
      {/* Desktop (md: 768px+) — barra de ancho completo */}
      <div
        className="hidden md:block fixed bottom-0 left-0 right-0 z-[60] px-10 pt-4 bg-white"
        style={{
          borderTop: "1px solid rgba(14,35,60,.16)",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        }}
      >
        <div className="max-w-[420px] ml-auto lg:mr-[max(0px,calc((100%-1024px)/2))]">
          <button
            onClick={onCheckout}
            aria-label={`Ver mi pedido, ${count} producto${count !== 1 ? "s" : ""}, ${formatCurrency(total)}`}
            className="brot-pill"
            style={{ justifyContent: "flex-start" }}
          >
            <CountPill count={count} />
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
        <button
          onClick={onCheckout}
          aria-label={`Ver mi pedido, ${count} producto${count !== 1 ? "s" : ""}, ${formatCurrency(total)}`}
          className="brot-pill"
          style={{
            justifyContent: "flex-start",
            boxShadow: "0 6px 18px rgba(14,35,60,.28)",
            transition: ctaTransition,
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(.98)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          onTouchStart={(e) => { e.currentTarget.style.transform = "scale(.98)"; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = ""; }}
        >
          <CountPill count={count} />
          <span className="whitespace-nowrap">Ver mi pedido</span>
          <span className="ml-auto whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(total)}</span>
        </button>
      </div>
    </>
  );
}
