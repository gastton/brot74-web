// BRT-131: segunda sección del home — historia/filosofía de la marca.
// Bloque de solo texto, sin fotos (BROT74 es una nano panadería sin local
// a la calle: no hay fotos de local que mostrar acá). Estilo editorial
// tipo "Om" de tobrod.dk — kicker + tres párrafos cortos, sin cards ni
// sombras, mucho aire vertical.
//
// Copy borrador (ver comentario en BRT-131 con el mismo texto) — cambiable
// libremente, no hay detalles factuales reales todavía (cuándo arrancó,
// quién hornea).
export default function HomeStory() {
  return (
    <section className="bg-navy px-6 py-24 md:py-32">
      <div className="max-w-[600px] mx-auto text-center">
        <p className="brot-hero-kicker">Sobre BROT 74</p>

        <div className="mt-10 space-y-6 text-[17px] md:text-[18px] leading-[1.75] text-cream/85">
          <p>
            BROT 74 nació en una cocina de casa, no en un local. Horneamos en
            tandas chicas, con el ritmo que pide la masa madre: no se apura,
            no se automatiza.
          </p>
          <p>
            Cada pan pasa por una fermentación larga y natural — la misma
            técnica de siempre, sin atajos. Elegimos calidad sobre volumen:
            preferimos hornear poco y bien, a mucho y parejo.
          </p>
          <p>
            No tenemos local a la calle. Tenemos un horno, un puñado de
            fechas por semana, y ganas de que cada pedido llegue como si
            fuera el único.
          </p>
        </div>
      </div>
    </section>
  );
}
