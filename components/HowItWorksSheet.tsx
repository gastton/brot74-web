"use client";

import { useRef } from "react";
import SheetShell, { useSheetClose } from "./SheetShell";

// v46 · 1b "¿Cómo funciona?": panel desde abajo sobre la pantalla de fecha.
// Los 3 pasos son los mismos que antes estaban en la landing ("Pedís hoy,
// retirás cuando esté listo"). Cierra con "Entendido", la X, tocando afuera,
// Escape o deslizando hacia abajo.
//
// v48: abre subiendo (320 ms, ease-out) con fade del scrim; cierra bajando
// (200 ms, ease-in) y se desmonta recién al terminar la salida. Con "reducir
// movimiento" no hay transición. v55: esa mecánica pasó a SheetShell, que
// comparte con el aviso al salir del pedido.
const STEPS = [
  { n: "1", t: "Elegí tu BROT", d: "Elegís la fecha y armás tu pedido online, según lo que haya disponible para esa tanda." },
  { n: "2", t: "Pagá por transferencia", d: "Confirmás con una transferencia. Sin filas, sin efectivo, a tu ritmo." },
  { n: "3", t: "Retirá en tu horario", d: "Pasás a buscarlo en el lugar y la franja horaria de la fecha. Horneamos por tandas, no hay local abierto." },
];

interface HowItWorksSheetProps {
  onClose: () => void;
}

function HowItWorksContent({ closeRef }: { closeRef: React.RefObject<HTMLButtonElement | null> }) {
  const requestClose = useSheetClose();
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <h2 id="how-title" className="brot-h whitespace-nowrap" style={{ fontSize: "32px" }}>
          ¿Cómo <span style={{ color: "#C8851A" }}>funciona</span>?
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={requestClose}
          aria-label="Cerrar"
          className="flex-none w-11 h-11 flex items-center justify-center border-none bg-transparent cursor-pointer"
          style={{ margin: "-8px -10px 0 0" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <ol className="list-none m-0 p-0" style={{ marginTop: "18px" }}>
        {STEPS.map((s) => (
          <li key={s.n} className="grid items-start gap-3" style={{ gridTemplateColumns: "44px minmax(0,1fr)", padding: "14px 0", borderTop: "1px solid rgba(14,35,60,.16)" }}>
            <span style={{ fontSize: "28px", lineHeight: 1, fontWeight: 300, letterSpacing: "-.02em", color: "#6E6A60" }}>
              0<b style={{ fontWeight: "inherit", color: "#C8851A" }}>{s.n}</b>
            </span>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-.01em", lineHeight: 1.2 }}>{s.t}</div>
              <p className="m-0 text-stone" style={{ fontSize: "15px", lineHeight: 1.45, marginTop: "4px" }}>{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <button type="button" onClick={requestClose} className="brot-pill" style={{ marginTop: "18px" }}>
        Entendido
      </button>
    </>
  );
}

export default function HowItWorksSheet({ onClose }: HowItWorksSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <SheetShell onClose={onClose} labelledBy="how-title" initialFocusRef={closeRef}>
      <HowItWorksContent closeRef={closeRef} />
    </SheetShell>
  );
}
