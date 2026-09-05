import Reveal from "@/components/Reveal";

// BRT-132 / rediseño skeleton tobrod.dk: "Ingredientes" calcado del
// bloque "Surdejsbrød" de tobrod.dk — mismo tratamiento simple que
// HomeStory (label + párrafos, sin rail/pull-quote/tags).
//
// Copy anclado en datos reales del catálogo (prisma/seed.ts): todos los
// productos comparten harina + agua + sal + masa madre, sin aditivos —
// ver también el comentario dejado en BRT-132.
export default function HomeIngredients() {
  return (
    <section className="bg-white border-t border-navy/10">
      <Reveal className="max-w-[720px] mx-auto px-6 py-20 md:py-28">
        <h2 className="text-amber text-[12px] font-bold uppercase tracking-[.2em] mb-6">
          Ingredientes
        </h2>
        <div className="space-y-5 text-navy/80 text-[16px] md:text-[17px] leading-[1.8]">
          <p>
            Todos nuestros panes se hacen con lo mismo de siempre: harina,
            agua, sal y masa madre propia. Nada de levadura comercial, nada
            de mejoradores, nada de conservantes.
          </p>
          <p>
            La fermentación larga hace el trabajo que otros le piden a los
            aditivos: más sabor, mejor digestión, una corteza que realmente
            cruje.
          </p>
          <p>
            Elegimos harinas simples y trazables. Si un ingrediente no lo
            reconocerías en tu propia cocina, no entra en el pan.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
