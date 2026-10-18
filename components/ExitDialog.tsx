"use client";

import { useId, useRef, useSyncExternalStore } from "react";
import SheetShell, { useSheetClose } from "./SheetShell";

// v55 · aviso al salir del pedido con panes elegidos. Reemplaza al diálogo con
// ícono de alerta y botones NO / SÍ. Filete navy + rótulo ámbar + título, con la
// acción segura primero ("Seguir eligiendo", pastilla navy) y la destructiva como
// link subrayado. Mobile (<768px): panel desde abajo, igual al de "¿Cómo funciona?";
// desktop: modal centrado de 440 px. Esc y tocar el scrim = seguir eligiendo.
const DESKTOP_QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);
}

interface ExitDialogProps {
  eyebrow?: string;
  title: string;
  body: string;
  stayLabel: string;
  leaveLabel: string;
  // Texto más corto para el link en desktop (la fila tiene menos lugar).
  leaveLabelDesktop?: string;
  onStay: () => void;
  onLeave: () => void;
}

function ExitContent({
  eyebrow,
  title,
  body,
  stayLabel,
  leaveLabel,
  leaveLabelDesktop,
  onLeave,
  titleId,
  bodyId,
  stayRef,
  isDesktop,
}: Omit<ExitDialogProps, "onStay"> & {
  titleId: string;
  bodyId: string;
  stayRef: React.RefObject<HTMLButtonElement | null>;
  isDesktop: boolean;
}) {
  const requestClose = useSheetClose();
  return (
    <>
      <div className="brot-rule" />
      <div className="brot-mlabel" style={{ color: "#8A5A0E", letterSpacing: ".14em", marginTop: "18px" }}>{eyebrow}</div>
      <h2
        id={titleId}
        style={{
          fontFamily: "var(--font-jost), system-ui, sans-serif",
          fontWeight: 400,
          fontSize: "30px",
          lineHeight: 1.05,
          letterSpacing: "-.02em",
          color: "#0E233C",
          margin: "8px 0 0",
        }}
      >
        {title}
      </h2>
      <p id={bodyId} className="text-pretty" style={{ fontSize: "16px", lineHeight: 1.5, color: "#4A5463", margin: "12px 0 0" }}>
        {body}
      </p>
      <div
        className="flex"
        style={
          isDesktop
            ? { flexDirection: "row-reverse", alignItems: "center", gap: "20px", marginTop: "26px" }
            : { flexDirection: "column", gap: "4px", marginTop: "26px" }
        }
      >
        <button
          ref={stayRef}
          type="button"
          onClick={requestClose}
          className="brot-pill"
          style={isDesktop ? { width: "auto", flex: 1 } : undefined}
        >
          {stayLabel}
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="brot-link"
          style={isDesktop ? { width: "auto", flex: "none", whiteSpace: "nowrap" } : undefined}
        >
          {isDesktop ? (leaveLabelDesktop ?? leaveLabel) : leaveLabel}
        </button>
      </div>
    </>
  );
}

export default function ExitDialog({
  eyebrow = "Tu pedido",
  title,
  body,
  stayLabel,
  leaveLabel,
  leaveLabelDesktop,
  onStay,
  onLeave,
}: ExitDialogProps) {
  const isDesktop = useIsDesktop();
  const stayRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  return (
    <SheetShell
      onClose={onStay}
      labelledBy={titleId}
      describedBy={bodyId}
      role="alertdialog"
      layout={isDesktop ? "modal" : "sheet"}
      initialFocusRef={stayRef}
    >
      <ExitContent
        eyebrow={eyebrow}
        title={title}
        body={body}
        stayLabel={stayLabel}
        leaveLabel={leaveLabel}
        leaveLabelDesktop={leaveLabelDesktop}
        onLeave={onLeave}
        titleId={titleId}
        bodyId={bodyId}
        stayRef={stayRef}
        isDesktop={isDesktop}
      />
    </SheetShell>
  );
}
