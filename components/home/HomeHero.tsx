import InstagramIcon from "@/components/InstagramIcon";

// BRT-130 / rediseño skeleton tobrod.dk: hero a sangre con foto de fondo
// y una card superpuesta con marca + tagline, calcado del layout real
// de tobrod.dk: foto gigante, topbar con marca a la izquierda y un link
// a la derecha, card blanca flotando sobre la foto, ícono social suelto.
// Sin CTA propio — el único CTA de la home vive en HomePedidos (fix
// post-BRT-135); el link "Pedidos" de la topbar solo hace scroll ahí,
// no es un botón.
//
// Foto: /public/hero-hogaza.jpg (2370×2400, casi cuadrada — vuelta a la
// primera toma, CUT.jpg). Punto focal a mano — no viene de datos como en
// ProductCard (es un único asset estático, no hace falta una UI de
// punto focal para esto), pero queda como una constante fácil de
// retocar en vez de un valor mágico en el JSX.
const HERO_FOCAL_Y = 0; // 50 = centro; más bajo = ver más de la parte de arriba de la foto.

export default function HomeHero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col overflow-hidden">
      <div
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage: "url(/hero-hogaza.jpg)",
          backgroundPosition: `50% ${HERO_FOCAL_Y}%`,
        }}
        role="img"
        aria-label="Pan de masa madre recién horneado"
      />

      {/* Topbar */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
        <span className="font-bold text-navy text-[14px] tracking-[.04em] bg-white/90 rounded-full px-4 py-2">
          BROT 74
        </span>
        <a
          href="#pedidos"
          className="text-navy text-[12px] font-semibold uppercase tracking-[.12em] bg-white/90 rounded-full px-4 py-2 hover:bg-white transition-colors"
        >
          Pedidos
        </a>
      </div>

      {/* Card de marca, flotando sobre la foto */}
      <div className="relative z-10 mt-auto p-6 md:p-10">
        <div className="bg-white max-w-[360px] p-7 md:p-8" style={{ boxShadow: "0 24px 60px -24px rgba(14,35,60,.4)" }}>
          <h1 className="font-bold text-[26px] md:text-[30px] text-navy leading-tight">BROT 74</h1>
          <div className="h-px bg-navy/15 my-4" />
          <p className="text-amber text-[11px] font-bold uppercase tracking-[.2em] mb-3">
            Micropanadería de masa madre
          </p>
          <p className="text-navy/70 text-[14px] leading-relaxed">
            Pan de fermentación natural, como debe ser.
          </p>
        </div>
      </div>

      {/* Ícono social suelto, como en tobrod.dk */}
      <a
        href="https://www.instagram.com/brot.74"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram de BROT74"
        className="absolute bottom-6 right-6 z-10 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-navy hover:bg-white transition-colors"
      >
        <InstagramIcon className="w-[18px] h-[18px]" />
      </a>
    </section>
  );
}
