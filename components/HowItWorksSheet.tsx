"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// v46 · 1b "¿Cómo funciona?": panel desde abajo sobre la pantalla de fecha.
// Los 3 pasos son los mismos que antes estaban en la landing ("Pedís hoy,
// retirás cuando esté listo"). Cierra con "Entendido", la X, tocando afuera,
// Escape o deslizando hacia abajo.
//
// v48: abre subiendo (320 ms, ease-out) con fade del scrim; cierra bajando
// (200 ms, ease-in) y se desmonta recién al terminar la salida. Con "reducir
// movimiento" no hay transición.
const OPEN_MS = 320;
const CLOSE_MS = 200;
const SCRIM_IN_MS = 240;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
const STEPS = [
  { n: "1", t: "Elegí tu BROT", d: "Elegís la fecha y armás tu pedido online, según lo que haya disponible para esa tanda." },
  { n: "2", t: "Pagá por transferencia", d: "Confirmás con una transferencia. Sin filas, sin efectivo, a tu ritmo." },
  { n: "3", t: "Retirá en tu horario", d: "Pasás a buscarlo en el lugar y la franja horaria de la fecha. Horneamos por tandas, no hay local abierto." },
];

interface HowItWorksSheetProps {
  onClose: () => void;
}

export default function HowItWorksSheet({ onClose }: HowItWorksSheetProps) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const dyRef = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  // Cierre animado: primero baja el panel, después se desmonta.
  const requestClose = useCallback(() => {
    if (closeTimerRef.current) return;
    if (prefersReducedMotion()) { onClose(); return; }
    setClosing(true);
    closeTimerRef.current = setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    // Un frame con el panel abajo para que la entrada sea una transición.
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") requestClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const reduced = prefersReducedMotion();
  const shown = entered && !closing;
  const panelTransition = reduced || dragY !== 0
    ? "none"
    : closing
      ? `transform ${CLOSE_MS}ms cubic-bezier(.4,0,1,1)`
      : entered
        ? `transform ${dragY === 0 ? OPEN_MS : 0}ms cubic-bezier(.2,.8,.2,1)`
        : "none";

  function onTouchStart(e: React.TouchEvent) { startY.current = e.touches[0].clientY; }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    dyRef.current = Math.max(0, e.touches[0].clientY - startY.current);
    setDragY(dyRef.current);
  }
  function onTouchEnd() {
    if (dyRef.current > 80) requestClose();
    dyRef.current = 0;
    setDragY(0);
    startY.current = null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="how-title">
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(14,35,60,.55)",
          opacity: shown ? 1 : 0,
          transition: reduced ? "none" : `opacity ${closing ? CLOSE_MS : SCRIM_IN_MS}ms ${closing ? "ease-in" : "ease-out"}`,
        }}
        onClick={requestClose}
      />
      <div
        className="relative w-full bg-white"
        style={{
          maxWidth: "520px",
          borderRadius: "22px 22px 0 0",
          padding: "10px 20px calc(30px + env(safe-area-inset-bottom))",
          transform: shown || reduced ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: panelTransition,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "rgba(14,35,60,.16)", margin: "0 auto 14px" }} />
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
      </div>
    </div>
  );
}
