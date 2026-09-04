import GrainOverlay from "@/components/GrainOverlay";
import CtaButton from "@/components/CtaButton";
import Reveal from "@/components/Reveal";

interface HomePedidosProps {
  onReservar: () => void;
}

const serif = "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)";

// BRT-135: sexta y última sección del stack — el CTA/flow de pedidos que
// antes ERA el home entero, reubicado acá como cierre. Mismo
// `onReservar` (mismo router.push a buildFlowUrl({step:"slots"}), sin
// cambios de BRT-95) que ya usaba el hero — el flujo de selección de
// slot → menú → checkout no cambia en nada, solo desde dónde se dispara.
//
// Fondo crema + CtaButton compartido (BRT-135) para hacer de bookend
// visual con el hero: el home abre y cierra en el mismo tono cálido,
// con las secciones de texto/fotos navy en el medio. El copy del botón
// es distinto al del hero ("Elegí tu fecha" vs "Reservá tu BROT") para
// que no se lean como el mismo bloque repetido dos veces.
export default function HomePedidos({ onReservar }: HomePedidosProps) {
  return (
    <section
      className="relative flex flex-col items-center text-center overflow-hidden"
      style={{
        background: "radial-gradient(120% 60% at 50% 30%, rgba(200,133,26,.10), rgba(14,35,60,0) 60%), #FFFFFF",
        padding: "96px 24px",
      }}
    >
      <GrainOverlay variant="cream" />

      <Reveal className="relative flex flex-col items-center">
        <p className="brot-hero-kicker">Pedidos</p>

        <h2
          style={{
            fontFamily: serif,
            fontWeight: 800,
            fontSize: "clamp(28px, 4.5vw, 40px)",
            lineHeight: 1.15,
            letterSpacing: "-.01em",
            color: "#0E233C",
            margin: "22px 0 0",
            maxWidth: "16ch",
            textWrap: "balance" as React.CSSProperties["textWrap"],
          }}
        >
          Tu próximo{" "}
          <em style={{ fontStyle: "normal", color: "#C8851A" }}>BROT</em>{" "}
          está a un pedido de distancia.
        </h2>

        <CtaButton onClick={onReservar} label="Elegí tu fecha" style={{ marginTop: "36px" }} />
      </Reveal>
    </section>
  );
}
