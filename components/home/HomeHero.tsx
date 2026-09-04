"use client";

import BrotWordmark from "@/components/BrotWordmark";
import GrainOverlay from "@/components/GrainOverlay";

const serif = "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)";

// BRT-130: primer bloque del home. Extraído tal cual del render de
// HomeContent (antes era la vista "home" entera) para que el stack de
// secciones nuevas (historia, ingredientes, showcase, cómo funciona,
// pedidos — BRT-131 a BRT-135) pueda crecer alrededor sin que este
// componente tenga que cambiar.
//
// BRT-135 (fix): el CTA "Reservá tu BROT" que vivía acá se MUDÓ a la
// sección final Pedidos — no se duplicó. El hero ahora es solo
// presentación (marca + tagline), sin acción propia; toda conversión
// pasa por HomePedidos al final del stack.
export default function HomeHero() {
  return (
    <section
      className="brot-hero-section flex flex-col items-center text-center"
      style={{
        background: "radial-gradient(120% 60% at 50% 22%, rgba(200,133,26,.10), rgba(14,35,60,0) 60%), #FFFFFF",
        minHeight: "100svh",
        padding: "64px 40px 40px",
        position: "relative",
        justifyContent: "center",
      }}
    >
      {/* Grano sutil — le da algo de textura "hecho a mano" al fondo
         crema, que si no queda un poco plano/corporativo. */}
      <GrainOverlay variant="cream" />

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
        <BrotWordmark variant="navy" />
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
    </section>
  );
}
