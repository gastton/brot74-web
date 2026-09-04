"use client";

interface CtaButtonProps {
  onClick: () => void;
  label: string;
  className?: string;
  style?: React.CSSProperties;
}

const ctaTransition = "transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s";

// BRT-135: extraído del hero original (BRT-90) para tener un solo botón
// de CTA reusable, sin duplicar handlers de hover/press. El único caller
// hoy es HomePedidos — el CTA del hero se sacó (fix post-BRT-135: el
// botón se muda a la sección final, no se duplica). `className`/`style`
// quedan como escape hatch por si algún otro caller futuro necesita su
// propio ajuste responsive.
export default function CtaButton({ onClick, label, className, style }: CtaButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-[11px] font-bold border-none cursor-pointer${className ? ` ${className}` : ""}`}
      style={{
        fontSize: "16px",
        letterSpacing: ".01em",
        color: "#0E233C",
        background: "#C8851A",
        padding: "18px 30px",
        borderRadius: "12px",
        boxShadow: "0 16px 34px -14px rgba(200,133,26,.7)",
        transition: ctaTransition,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.background = "#E0A33A";
        e.currentTarget.style.boxShadow = "0 20px 40px -14px rgba(200,133,26,.85)";
        const arrow = e.currentTarget.querySelector(".arrow") as HTMLElement | null;
        if (arrow) arrow.style.transform = "translateX(4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.background = "#C8851A";
        e.currentTarget.style.boxShadow = "0 16px 34px -14px rgba(200,133,26,.7)";
        const arrow = e.currentTarget.querySelector(".arrow") as HTMLElement | null;
        if (arrow) arrow.style.transform = "";
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
      onTouchStart={(e) => { e.currentTarget.style.transform = "scale(.97)"; }}
      onTouchEnd={(e) => { e.currentTarget.style.transform = ""; }}
    >
      {label}{" "}
      <span className="arrow" style={{ fontSize: "17px", display: "inline-block", transition: "transform .2s cubic-bezier(.2,.7,.3,1)" }}>{"→"}</span>
    </button>
  );
}
