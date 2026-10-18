"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

// Cascarón compartido de "¿Cómo funciona?" (v46/v48) y del aviso al salir (v55):
// scrim navy + panel con animación de entrada y salida.
// - layout "sheet": panel desde abajo (320 ms ease-out al abrir, 200 ms ease-in
//   al cerrar), con agarradera y cierre deslizando hacia abajo.
// - layout "modal": tarjeta centrada de 440 px con esquinas rectas (v55, desktop);
//   misma duración, con fade en vez de desplazamiento.
// Esc, tocar el scrim y deslizar hacia abajo cierran (onClose se llama recién al
// terminar la salida). Con "reducir movimiento" no hay transiciones.
const OPEN_MS = 320;
const CLOSE_MS = 200;
const SCRIM_IN_MS = 240;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Los botones del contenido cierran con animación llamando a useSheetClose().
const SheetCloseContext = createContext<() => void>(() => {});
export function useSheetClose() {
  return useContext(SheetCloseContext);
}

interface SheetShellProps {
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
  layout?: "sheet" | "modal";
  // Elemento que recibe el foco al abrir.
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

export default function SheetShell({
  onClose,
  labelledBy,
  describedBy,
  role = "dialog",
  layout = "sheet",
  initialFocusRef,
  children,
}: SheetShellProps) {
  const isSheet = layout === "sheet";
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const dyRef = useRef(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  // Cierre animado: primero sale el panel, después se desmonta.
  const requestClose = useCallback(() => {
    if (closeTimerRef.current) return;
    if (prefersReducedMotion()) { onClose(); return; }
    setClosing(true);
    closeTimerRef.current = setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    initialFocusRef?.current?.focus();
    // Un frame con el panel afuera para que la entrada sea una transición.
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [initialFocusRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") requestClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

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

  const reduced = prefersReducedMotion();
  const shown = entered && !closing;
  const ease = closing ? "cubic-bezier(.4,0,1,1)" : "cubic-bezier(.2,.8,.2,1)";
  const ms = closing ? CLOSE_MS : OPEN_MS;

  const panelStyle: React.CSSProperties = isSheet
    ? {
        maxWidth: "520px",
        borderRadius: "22px 22px 0 0",
        padding: "10px 20px calc(30px + env(safe-area-inset-bottom))",
        transform: shown || reduced ? `translateY(${dragY}px)` : "translateY(100%)",
        transition: reduced || dragY !== 0 || !(entered || closing) ? "none" : `transform ${ms}ms ${ease}`,
      }
    : {
        maxWidth: "440px",
        padding: "36px 36px 28px",
        opacity: shown || reduced ? 1 : 0,
        transition: reduced ? "none" : `opacity ${ms}ms ${ease}`,
      };

  return (
    <div
      className={`fixed inset-0 z-[80] flex justify-center ${isSheet ? "items-end" : "items-center p-[19px]"}`}
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
    >
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
        style={panelStyle}
        onTouchStart={isSheet ? onTouchStart : undefined}
        onTouchMove={isSheet ? onTouchMove : undefined}
        onTouchEnd={isSheet ? onTouchEnd : undefined}
      >
        {isSheet && (
          <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "rgba(14,35,60,.16)", margin: "0 auto 14px" }} />
        )}
        <SheetCloseContext.Provider value={requestClose}>{children}</SheetCloseContext.Provider>
      </div>
    </div>
  );
}
