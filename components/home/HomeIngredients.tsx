// BRT-132: tercera sección del home — ingredientes/materia prima.
// Mismo tratamiento tipográfico y de paleta que HomeStory (BRT-131,
// consistencia pedida por el criterio de aceptación): fondo navy, kicker
// ámbar, cuerpo en crema. Un hairline arriba (mismo patrón que el borde
// de HomeFooter) marca el corte entre ambas secciones de texto para que
// no se lean como un solo bloque continuo.
//
// Copy anclado en datos reales del catálogo (prisma/seed.ts): todos los
// productos comparten harina + agua + sal + masa madre, sin aditivos —
// ver también el comentario dejado en BRT-132.
export default function HomeIngredients() {
  return (
    <section className="bg-navy border-t border-cream/10 px-6 py-24 md:py-32">
      <div className="max-w-[600px] mx-auto text-center">
        <p className="brot-hero-kicker">Ingredientes</p>

        <div className="mt-10 space-y-6 text-[17px] md:text-[18px] leading-[1.75] text-cream/85">
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
      </div>
    </section>
  );
}
