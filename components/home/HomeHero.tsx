"use client";

interface HomeHeroProps {
  onReservar: () => void;
}

const serif = "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)";

const ctaTransition = "transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s";

// BRT-130: primer bloque del home. Extraído tal cual del render de
// HomeContent (antes era la vista "home" entera) para que el stack de
// secciones nuevas (historia, ingredientes, showcase, cómo funciona,
// pedidos — BRT-131 a BRT-135) pueda crecer alrededor sin que este
// componente tenga que cambiar.
export default function HomeHero({ onReservar }: HomeHeroProps) {
  return (
    <section
      className="brot-hero-section flex flex-col items-center text-center"
      style={{
        background: "radial-gradient(120% 60% at 50% 22%, rgba(200,133,26,.10), rgba(14,35,60,0) 60%), #F9F5EC",
        minHeight: "100svh",
        padding: "64px 40px 40px",
        position: "relative",
        justifyContent: "center",
      }}
    >
      {/* Grano sutil — le da algo de textura "hecho a mano" al fondo
         crema, que si no queda un poco plano/corporativo. Puramente
         CSS (SVG inline), no suma ningún asset nuevo. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          opacity: 0.035,
          mixBlendMode: "multiply",
          pointerEvents: "none",
        }}
      />

      {/* Sello — v30: ramillete navy sobre crema (antes crema sobre navy) */}
      <div
        className="brot-hero-seal-wrap"
        style={{
          position: "relative",
          width: "230px",
          height: "230px",
          fontSize: "230px",
          flexShrink: 0,
          filter: "drop-shadow(0 20px 36px rgba(0,0,0,.35))",
        }}
      >
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="48" fill="none" stroke="#0E233C" strokeWidth="1" opacity="0.95" />
          <circle cx="50" cy="50" r="43.6" fill="none" stroke="#0E233C" strokeWidth="0.5" opacity="0.6" />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: ".05em",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ramillete-mono-navy.png" alt="" style={{ height: ".56em", width: "auto", display: "block" }} />
          <div
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              lineHeight: 1,
              marginTop: ".01em",
              fontFamily: "var(--font-jost, 'Jost', sans-serif)",
            }}
          >
            <span style={{ fontWeight: 500, fontSize: ".115em", color: "#0E233C" }}>BROT</span>
            <span style={{ fontWeight: 700, fontSize: ".115em", letterSpacing: "-.2em", marginLeft: ".18em", color: "#C8851A" }}>74</span>
          </div>
        </div>
      </div>

      {/* Kicker */}
      <p className="brot-hero-kicker" style={{ marginTop: "48px" }}>
        Micropanadería de masa madre
      </p>

      {/* Título */}
      <h1
        className="brot-hero-h1"
        style={{
          fontFamily: serif,
          fontWeight: 800,
          fontSize: "clamp(40px, 7.5vw, 60px)",
          lineHeight: 1.08,
          letterSpacing: "-.015em",
          color: "#0E233C",
          margin: "26px 0 0",
          maxWidth: "13ch",
          textWrap: "balance" as React.CSSProperties["textWrap"],
        }}
      >
        Pan de fermentación natural,{" "}
        <em style={{ fontStyle: "normal", color: "#C8851A" }}>como debe ser.</em>
      </h1>

      {/* CTA */}
      <button
        onClick={onReservar}
        className="brot-hero-cta inline-flex items-center gap-[11px] font-bold border-none cursor-pointer"
        style={{
          marginTop: "44px",
          fontSize: "16px",
          letterSpacing: ".01em",
          color: "#0E233C",
          background: "#C8851A",
          padding: "18px 30px",
          borderRadius: "12px",
          boxShadow: "0 16px 34px -14px rgba(200,133,26,.7)",
          transition: ctaTransition,
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
        Reservá tu BROT{" "}
        <span className="arrow" style={{ fontSize: "17px", display: "inline-block", transition: "transform .2s cubic-bezier(.2,.7,.3,1)" }}>{"→"}</span>
      </button>
    </section>
  );
}
