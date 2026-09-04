import GrainOverlay from "@/components/GrainOverlay";
import Reveal from "@/components/Reveal";

// BRT-132: tercera sección del home — ingredientes/materia prima. Mismo
// layout editorial asimétrico (rail + columna de contenido) que
// HomeStory, con su propia pull quote corta ("Harina, agua, sal y masa
// madre. Nada más."). La fila de tags ("Sin levadura comercial", etc.)
// se sacó a pedido — si hace falta diferenciarla más de HomeStory,
// conviene resolverlo con otra variación (no con tags).
//
// Copy anclado en datos reales del catálogo (prisma/seed.ts): todos los
// productos comparten harina + agua + sal + masa madre, sin aditivos —
// ver también el comentario dejado en BRT-132.
export default function HomeIngredients() {
  return (
    <section className="relative bg-white border-t border-navy/10 overflow-hidden">
      <GrainOverlay variant="cream" />
      <div className="relative max-w-[1080px] mx-auto px-6 md:px-10 py-24 md:py-36 grid md:grid-cols-[180px_1fr] gap-8 md:gap-16">
        {/* Rail: índice + eyebrow */}
        <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-5">
          <span className="font-mono text-amber text-[13px] tracking-[.08em]">02 — 03</span>
          <span className="text-navy/50 text-[11px] font-semibold uppercase tracking-[.24em]">
            Ingredientes
          </span>
        </div>

        {/* Contenido */}
        <Reveal>
          <p className="text-navy text-[28px] md:text-[38px] font-bold leading-[1.2] tracking-[-.01em] max-w-[16ch] text-balance">
            Harina, agua, sal y{" "}
            <span className="text-amber">masa madre. Nada más.</span>
          </p>

          <div className="mt-8 space-y-5 text-[16px] md:text-[17px] leading-[1.75] text-navy/60 max-w-[54ch]">
            <p>
              La fermentación larga hace el trabajo que otros le piden a los
              aditivos: más sabor, mejor digestión, una corteza que
              realmente cruje.
            </p>
            <p>
              Elegimos harinas simples y trazables. Si un ingrediente no lo
              reconocerías en tu propia cocina, no entra en el pan.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
