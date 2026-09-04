interface GrainOverlayProps {
  /** cream: sección clara (hero) — grano oscurece con multiply. navy: sección oscura — grano aclara con overlay. */
  variant?: "cream" | "navy";
}

// Extraído del hero (BRT-90 / BRT-130) para reusar en las secciones navy
// nuevas (BRT-131, BRT-132) sin duplicar el mismo SVG de ruido inline en
// cada archivo. Puramente CSS/SVG, no suma ningún asset.
export default function GrainOverlay({ variant = "cream" }: GrainOverlayProps) {
  const isNavy = variant === "navy";
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        opacity: isNavy ? 0.05 : 0.035,
        mixBlendMode: isNavy ? "overlay" : "multiply",
        pointerEvents: "none",
      }}
    />
  );
}
