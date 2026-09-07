import Reveal from "@/components/Reveal";

// BRT-131 / rediseño skeleton tobrod.dk: "Historia" calcado del bloque
// "Om" de tobrod.dk — label chico + párrafos apilados, alineado a la
// izquierda, sin rail/índice ni pull-quote grande (eso era de la v2
// editorial anterior). Sin fotos (BROT74 es una nano panadería sin
// local a la calle).
//
// Copy real del origen del nombre (reemplaza el borrador anterior de
// BRT-131 — ya no es texto de relleno, es la historia confirmada de la
// marca). Dos actos: por qué "BROT" y por qué "74", con un subtítulo
// intermedio para separarlos.
export default function HomeStory() {
  return (
    <section className="bg-white border-t border-navy/10">
      <Reveal className="max-w-[720px] mx-auto px-6 py-20 md:py-28">
        <h2 className="text-amber text-[12px] font-bold uppercase tracking-[.2em] mb-6">
          ¿Por qué BROT 74?
        </h2>
        <div className="space-y-5 text-navy/80 text-[16px] md:text-[17px] leading-[1.8]">
          <p>
            BROT nace de una idea simple: buscar una palabra que conectara
            con la cultura del pan y que, al mismo tiempo, tuviera una
            identidad propia.
          </p>
          <p>
            En varios idiomas, la palabra pan comienza con BR: bread en
            inglés, brød en danés y noruego, bröd en sueco. Pero hubo una
            palabra que nos llamó especialmente la atención: Brot, que
            significa pan en alemán.
          </p>
          <p>
            Y si hay un país donde el pan forma parte de la cultura, la
            tradición y la vida cotidiana, ese es Alemania.
          </p>
          <p>Así nació BROT.</p>
        </div>

        <h3 className="text-navy font-bold text-[19px] md:text-[21px] mt-10 mb-4">
          ¿Y el 74?
        </h3>
        <div className="space-y-5 text-navy/80 text-[16px] md:text-[17px] leading-[1.8]">
          <p>
            Porque BROT ya estaba ocupado en Instagram. Necesitábamos
            encontrar un número, pero no queríamos sumar un número porque
            sí. Queríamos que tuviera un significado, que fuera parte de
            nuestra historia.
          </p>
          <p>Y apareció el 74.</p>
          <p>74% es la hidratación de nuestra masa madre.</p>
          <p>
            Un dato técnico, propio de nuestro proceso, que terminó
            convirtiéndose en parte de nuestra identidad.
          </p>
          <p>Por suerte, BROT.74 estaba disponible.</p>
          <p>
            Y así, casi sin buscarlo, encontramos nuestro nombre: BROT 74.
          </p>
          <p>Pan, proceso y una historia detrás de cada número.</p>
        </div>
      </Reveal>
    </section>
  );
}
