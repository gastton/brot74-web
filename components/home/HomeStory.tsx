import Reveal from "@/components/Reveal";

const LABEL_CLASS = "text-amber text-[12px] font-bold uppercase tracking-[.2em]";

// BRT-131 / rediseño skeleton tobrod.dk: "Historia" calcado del bloque
// "Om" de tobrod.dk, pero a dos columnas (foto + texto) — a pedido, para
// aprovechar el espacio vacío a la izquierda del texto que dejaba la
// columna centrada angosta. La foto (public/historia-brot.jpg) va
// arriba del texto en mobile y a la izquierda en desktop; sin crop
// forzado (h-auto, respeta el aspecto real de la foto) para mantener el
// criterio flat del resto del esqueleto — nada de cards ni sombras.
//
// Copy real del origen del nombre, v2 (más corta que la primera pasada
// — a pedido, sección compacta): por qué "BROT" (pan en alemán) y por
// qué "74" (% de hidratación de la masa madre). "¿Por qué BROT 74?" y
// "¿Y el 74?" comparten exactamente el mismo estilo (ámbar, mismo
// tamaño — LABEL_CLASS) en vez de una jerarquía h2/h3 distinta, a
// pedido. Interlineado ajustado (leading-snug, menos espacio entre
// párrafos) para que toda la sección se sienta compacta, no la
// respiración amplia que tienen Ingredientes/Cómo funciona.
export default function HomeStory() {
  return (
    <section className="bg-white border-t border-navy/10">
      <Reveal className="max-w-[1080px] mx-auto px-6 md:px-10 py-14 md:py-20 grid md:grid-cols-[320px_1fr] gap-8 md:gap-12 items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/historia-brot.jpg"
          alt="Pan de masa madre recién horneado, corte cenital"
          className="w-full h-auto"
        />

        <div>
          <h2 className={`${LABEL_CLASS} mb-3`}>¿Por qué BROT 74?</h2>
          <div className="space-y-2 text-navy/80 text-[16px] md:text-[17px] leading-snug">
            <p>
              BROT 74 nace de una idea simple: encontrar una palabra que
              conectara con la cultura del pan y que, al mismo tiempo,
              tuviera una identidad propia.
            </p>
            <p>
              Brot significa pan en alemán. Y si hay un país donde el pan
              forma parte de la cultura, la tradición y la vida
              cotidiana, ese es Alemania.
            </p>
          </div>

          <h2 className={`${LABEL_CLASS} mt-6 mb-3`}>¿Y el 74?</h2>
          <div className="space-y-2 text-navy/80 text-[16px] md:text-[17px] leading-snug">
            <p>
              Nuestra identidad también está en ese número. 74% es la
              hidratación de nuestra masa madre.
            </p>
            <p>Así de simple.</p>
            <p>Como el pan.</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
