import GrainOverlay from "@/components/GrainOverlay";
import Reveal from "@/components/Reveal";

const STEPS = [
  {
    title: "Elegí tu pan",
    desc: "Elegís la fecha y armás tu pedido online, según lo que haya disponible para esa tanda.",
  },
  {
    title: "Pagá por transferencia",
    desc: "Confirmás con una transferencia. Sin filas, sin efectivo, a tu ritmo.",
  },
  {
    title: "Retirá en tu horario",
    desc: "Pasás a buscarlo en el lugar y la franja horaria de tu fecha — horneamos por tandas, no hay local abierto todo el día.",
  },
];

// BRT-134: quinta sección del home — cómo funciona el pedido. Pasos
// numerados tipo "Dagens gang" de tobrod.dk, adaptados a que BROT74 no
// tiene local físico al que ir en cualquier momento (paso 3 lo aclara
// explícitamente). Mismo tratamiento rail/pull-quote que Historia e
// Ingredientes, pero el cuerpo es una lista con línea conectora en vez
// de párrafos — mismo patrón visual que ya usa el pipeline de
// app/como-se-hizo/page.tsx, adaptado a la paleta navy/amber sobre
// crema (fondo blanco/crema en todo el home — feedback post-BRT-135).
export default function HomeHowItWorks() {
  return (
    <section className="relative bg-cream border-t border-navy/10 overflow-hidden">
      <GrainOverlay variant="cream" />
      <div className="relative max-w-[1080px] mx-auto px-6 md:px-10 py-24 md:py-36 grid md:grid-cols-[180px_1fr] gap-8 md:gap-16">
        {/* Rail: índice + eyebrow */}
        <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-5">
          <span className="font-mono text-amber text-[13px] tracking-[.08em]">03 — 03</span>
          <span className="text-navy/50 text-[11px] font-semibold uppercase tracking-[.24em]">
            Cómo funciona
          </span>
        </div>

        {/* Contenido */}
        <Reveal>
          <p className="text-navy text-[28px] md:text-[38px] font-bold leading-[1.2] tracking-[-.01em] max-w-[18ch] text-balance">
            Pedís hoy,{" "}
            <span className="text-amber">retirás en tu fecha.</span>
          </p>

          <div className="relative mt-10 md:mt-12 max-w-[54ch] pl-9">
            <div
              aria-hidden="true"
              className="absolute left-3 top-1 bottom-1 w-px bg-navy/15"
            />
            <ol className="space-y-9">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="absolute -left-9 top-0 w-6 h-6 rounded-full bg-cream border-2 border-amber flex items-center justify-center text-amber font-mono text-[11px] leading-none">
                    {i + 1}
                  </span>
                  <div className="text-navy font-semibold text-[17px] mb-1.5">
                    {step.title}
                  </div>
                  <div className="text-navy/60 text-[15px] leading-[1.7]">
                    {step.desc}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
