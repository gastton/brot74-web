import Reveal from "@/components/Reveal";

// BRT-131 / rediseño skeleton tobrod.dk: "Historia" calcado del bloque
// "Om" de tobrod.dk — label chico + párrafos apilados, alineado a la
// izquierda, sin rail/índice ni pull-quote grande (eso era de la v2
// editorial anterior). Sin fotos (BROT74 es una nano panadería sin
// local a la calle).
//
// Copy borrador (ver comentario en BRT-131) — cambiable libremente, no
// hay detalles factuales reales todavía (cuándo arrancó, quién hornea).
export default function HomeStory() {
  return (
    <section className="bg-white border-t border-navy/10">
      <Reveal className="max-w-[720px] mx-auto px-6 py-20 md:py-28">
        <h2 className="text-amber text-[12px] font-bold uppercase tracking-[.2em] mb-6">
          Sobre BROT 74
        </h2>
        <div className="space-y-5 text-navy/80 text-[16px] md:text-[17px] leading-[1.8]">
          <p>
            BROT 74 nació en una cocina de casa, no en un local. Horneamos en
            tandas chicas, con el ritmo que pide la masa madre: no se apura,
            no se automatiza.
          </p>
          <p>
            Cada pan pasa por una fermentación larga y natural — la misma
            técnica de siempre, sin atajos. Preferimos hornear poco y bien,
            a mucho y parejo.
          </p>
          <p>
            No tenemos local a la calle. Tenemos un horno, un puñado de
            fechas por semana, y ganas de que cada pedido llegue como si
            fuera el único.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
