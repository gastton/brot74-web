interface BrotWordmarkProps {
  /** navy: texto navy sobre fondo crema (hero). cream: texto crema sobre fondo navy (confirmación). */
  variant: "navy" | "cream";
}

// BRT-130: el bloque de imagen + wordmark "BROT74" del sello se repetía
// entre el hero del home y app/confirmacion/page.tsx (mismos colores
// invertidos) — ya estaba duplicado antes, pero SonarCloud recién lo marcó
// como código nuevo duplicado al mover el hero a su propio archivo
// (components/home/HomeHero.tsx). Se centraliza acá.
export default function BrotWordmark({ variant }: BrotWordmarkProps) {
  const textColor = variant === "navy" ? "#0E233C" : "#F9F5EC";
  const imgSrc = variant === "navy" ? "/ramillete-mono-navy.png" : "/ramillete-mono-cream.png";

  return (
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
      <img src={imgSrc} alt="" style={{ height: ".56em", width: "auto", display: "block" }} />
      <div
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          lineHeight: 1,
          marginTop: ".01em",
          fontFamily: "var(--font-jost, 'Jost', sans-serif)",
        }}
      >
        <span style={{ fontWeight: 500, fontSize: ".115em", color: textColor }}>BROT</span>
        <span style={{ fontWeight: 700, fontSize: ".115em", letterSpacing: "-.2em", marginLeft: ".18em", color: "#C8851A" }}>74</span>
      </div>
    </div>
  );
}
