import GrainOverlay from "@/components/GrainOverlay";
import Reveal from "@/components/Reveal";

// BRT-131: segunda sección del home — historia/filosofía de la marca.
// v2 (feedback: la v1 centrada se veía "ultra básica" al lado de
// Ingredientes, casi idéntica). Ahora es un layout editorial asimétrico
// — rail izquierdo con índice + eyebrow, columna derecha con una frase
// de apertura grande ("pull quote") y el cuerpo más chico y atenuado —
// en vez de kicker + párrafos centrados. Sin fotos (BROT74 es una nano
// panadería sin local a la calle).
//
// Copy borrador (ver comentario en BRT-131) — cambiable libremente, no
// hay detalles factuales reales todavía (cuándo arrancó, quién hornea).
export default function HomeStory() {
  return (
    <section className="relative bg-cream overflow-hidden">
      <GrainOverlay variant="cream" />
      <div className="relative max-w-[1080px] mx-auto px-6 md:px-10 py-24 md:py-36 grid md:grid-cols-[180px_1fr] gap-8 md:gap-16">
        {/* Rail: índice + eyebrow */}
        <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-5">
          <span className="font-mono text-amber text-[13px] tracking-[.08em]">01 — 03</span>
          <span className="text-navy/50 text-[11px] font-semibold uppercase tracking-[.24em]">
            Sobre BROT 74
          </span>
        </div>

        {/* Contenido */}
        <Reveal>
          <p className="text-navy text-[28px] md:text-[38px] font-bold leading-[1.2] tracking-[-.01em] max-w-[16ch] text-balance">
            Nació en una cocina de casa,{" "}
            <span className="text-amber">no en un local.</span>
          </p>

          <div className="mt-8 space-y-5 text-[16px] md:text-[17px] leading-[1.75] text-navy/60 max-w-[54ch]">
            <p>
              Horneamos en tandas chicas, con el ritmo que pide la masa
              madre: no se apura, no se automatiza.
            </p>
            <p>
              Cada pan pasa por una fermentación larga y natural — la misma
              técnica de siempre, sin atajos. Preferimos hornear poco y
              bien, a mucho y parejo.
            </p>
            <p>
              Tenemos un horno, un puñado de fechas por semana, y ganas de
              que cada pedido llegue como si fuera el único.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
