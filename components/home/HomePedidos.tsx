import CtaButton from "@/components/CtaButton";
import Reveal from "@/components/Reveal";

interface HomePedidosProps {
  onReservar: () => void;
}

const serif = "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)";

// BRT-135 / rediseño skeleton tobrod.dk: sexta y última sección del
// stack — el CTA/flow de pedidos que antes ERA el home entero,
// reubicado acá como cierre. Mismo `onReservar` (mismo router.push a
// buildFlowUrl({step:"slots"}), sin cambios de BRT-95) que ya usaba el
// hero — el flujo de selección de slot → menú → checkout no cambia en
// nada, solo desde dónde se dispara. El link "Pedidos" de la topbar del
// hero (#pedidos) apunta acá.
//
// Fondo blanco plano, sin grano ni glow — sigue el criterio flat del
// resto del esqueleto nuevo. El copy del botón es distinto al que tenía
// el hero antes ("Elegí tu fecha" vs "Reservá tu BROT") para que no se
// lean como el mismo bloque repetido dos veces si en algún momento
// vuelve a haber texto similar arriba.
export default function HomePedidos({ onReservar }: HomePedidosProps) {
  return (
    <section
      id="pedidos"
      className="flex flex-col items-center text-center border-t border-navy/10"
      style={{ padding: "96px 24px" }}
    >
      <Reveal className="flex flex-col items-center">
        <p className="text-amber text-[12px] font-bold uppercase tracking-[.2em]">Pedidos</p>

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
