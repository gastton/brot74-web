import Reveal from "@/components/Reveal";

const STEPS = [
  "Elegís la fecha y armás tu pedido online, según lo que haya disponible para esa tanda.",
  "Confirmás con una transferencia. Sin filas, sin efectivo, a tu ritmo.",
  "Retirás en el lugar y la franja horaria de tu fecha — horneamos por tandas, no hay local abierto todo el día.",
];

// BRT-134 / rediseño skeleton tobrod.dk: "Cómo funciona" calcado del
// bloque "Dagens gang" de tobrod.dk — ahí el flujo real (elegir → pagar
// con QR → listo) es una lista numerada simple dentro del texto, no una
// timeline con círculos y línea conectora (eso era de la v2 editorial
// anterior). Mismo criterio: el paso 3 aclara que el retiro es en el
// slot/horario elegido, no una visita libre a un local (BROT74 no tiene
// local físico al que ir en cualquier momento).
export default function HomeHowItWorks() {
  return (
    <section className="bg-white border-t border-navy/10">
      <Reveal className="max-w-[720px] mx-auto px-6 py-20 md:py-28">
        <h2 className="text-amber text-[12px] font-bold uppercase tracking-[.2em] mb-6">
          Cómo funciona
        </h2>
        <ol className="space-y-4 text-navy/80 text-[16px] md:text-[17px] leading-[1.8] list-decimal list-outside pl-5 marker:text-amber marker:font-bold">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
