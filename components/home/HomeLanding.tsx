"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import "./HomeLanding.css";

// v59: estado de pedidos, calculado en el servidor (app/page.tsx) con la misma
// fuente que el flujo de pedidos. open = hay una fecha para pedir.
export type LandingStatus = { open: boolean };

interface HomeLandingProps {
  onReservar: () => void;
  status: LandingStatus;
}

const INSTAGRAM_URL = "https://www.instagram.com/brot.74";

// v50: landing v3.3 (nórdico editorial). Conversión a React de
// _design/design_cambios_v50/pantallas_actualizadas/landing.html (fuente de
// verdad de estilos y comportamiento; ver manifest.json → manual_steps).
// Cambios respecto del HTML estático:
// - Los CTA "Elegí tu BROT" son <button onClick={onReservar}> que usan el
//   router del sitio (buildFlowUrl de BRT-95), no un <a href> a un anchor.
// - Las fotos van con next/image en vez de <img> planas.
// - El script de scroll (menú + barra mobile) pasó a un useEffect.
// Pill de estado (menú, hero y barra mobile): punto + texto. Abierto: "Elegí tu BROT"
// con punto ámbar que late. Cerrado: "Avisame cuando abra" con punto terracota fijo.
// Los dos llevan al flujo de pedidos, que con 0 fechas abiertas muestra "Pedidos
// cerrados". El estado se dice con texto, no solo con color.
function StatusButton({ open, onClick, btnRef }: { open: boolean; onClick: () => void; btnRef?: React.Ref<HTMLButtonElement> }) {
  return (
    <button type="button" className="btn st" onClick={onClick} ref={btnRef}>
      <span className="st-dot" aria-hidden="true" />
      {open ? "Elegí tu BROT" : "Tu próximo BROT"}
    </button>
  );
}

function InstagramIcon({ strokeWidth }: { strokeWidth: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface MediaProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}

function Media({ src, alt, sizes, priority }: MediaProps) {
  return (
    <div className="media">
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: "cover" }} />
    </div>
  );
}

const STEPS = [
  { n: "01", t: "Elegí tu BROT", d: "Elegís la fecha y armás tu pedido online, según lo que haya disponible para esa tanda." },
  { n: "02", t: "Pagá por transferencia", d: "Confirmás con una transferencia. Sin filas, sin efectivo, a tu ritmo." },
  { n: "03", t: "Retirá en tu horario", d: "Pasás a buscarlo en el lugar y la franja de la fecha. Horneamos por tandas, no hay local abierto." },
];

export default function HomeLanding({ onReservar, status }: HomeLandingProps) {
  const barRef = useRef<HTMLElement>(null);
  const mbarRef = useRef<HTMLDivElement>(null);
  const heroBtnRef = useRef<HTMLButtonElement>(null);

  // Menú fijo: transparente sobre el hero → .solid al scrollear (>40px) → .off
  // al bajar pasados 480px (reaparece al subir). Barra mobile (.mbar): aparece
  // recién cuando el botón del hero sale de pantalla. Se togglean clases
  // directo en el DOM (como el script de la referencia) para no re-renderizar
  // en cada evento de scroll.
  useEffect(() => {
    const bar = barRef.current;
    const mbar = mbarRef.current;
    const heroBtn = heroBtnRef.current;
    if (!bar) return;

    let last = window.scrollY;
    function update() {
      const y = window.scrollY;
      if (mbar && heroBtn) mbar.classList.toggle("on", heroBtn.getBoundingClientRect().bottom < 0);
      bar!.classList.toggle("solid", y > 40);
      bar!.classList.toggle("off", y > 480 && y > last + 2);
      if (y < last - 2 || y <= 480) bar!.classList.remove("off");
      last = y;
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className={`brot-landing${status.open ? "" : " cerrado"}`}>
      {/* Menú fijo */}
      <header className="bar" ref={barRef}>
        <div className="wrap">
          <a className="brand" href="#top">
            <Image src="/assets/logo-sello-mono-navy-transparente.png" alt="" width={2400} height={2400} />
            <span>BROT <em>74</em></span>
          </a>
          <nav className="nav">
            <a className="hide-m" href="#pedir">Cómo pedir</a>
            <a className="ig hide-m" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <InstagramIcon strokeWidth={1.6} />
            </a>
            <StatusButton open={status.open} onClick={onReservar} />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="hero" id="top">
        <div className="media">
          <Image
            src="/assets/landing-hero.webp"
            alt="Pan de masa madre recién horneado, con corte y harina"
            fill
            sizes="100vw"
            priority
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="hero-card">
          <div className="rule"></div>
          <div className="eyebrow">Micropanadería de masa madre</div>
          <h1>Panes de fermentación natural, <i>como debe ser.</i></h1>
          <div className="hero-actions">
            <StatusButton open={status.open} onClick={onReservar} btnRef={heroBtnRef} />
          </div>
        </div>
      </div>

      {/* Idea */}
      <section id="idea">
        <div className="wrap">
          <div className="grid">
            <div className="idea-a">
              <Media
                src="/assets/landing-idea-1.webp"
                alt="Miga abierta de un pan de masa madre cortado al medio"
                sizes="(min-width: 861px) 40vw, 100vw"
              />
              <div className="idea-txt">
                <div className="eyebrow"><b>01</b>Idea</div>
                <h2>Pocos panes, mucho tiempo.</h2>
                <p>
                  El concepto es básico: pocos panes, elaborados con productos naturales, sin conservantes ni
                  aditivos. Y el tiempo como parte fundamental del proceso.
                </p>
              </div>
            </div>
            <div className="idea-b">
              <Media
                src="/assets/landing-idea-2.webp"
                alt="Baguette de masa madre sobre mesa de madera"
                sizes="(min-width: 861px) 40vw, 100vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Frase destacada */}
      <div className="wrap">
        <figure className="quote" style={{ margin: 0 }}>
          <div className="rule"></div>
          <blockquote>Harinas,<br />agua y sal.</blockquote>
          <figcaption>El tiempo y la paciencia hacen el resto</figcaption>
        </figure>
      </div>

      {/* Por qué BROT 74 */}
      <section className="porque" id="porque">
        <div className="wrap">
          <div className="grid">
            <div className="porque-img">
              <Media
                src="/assets/landing-porque.webp"
                alt="Porción servida en plato de cerámica"
                sizes="(min-width: 861px) 40vw, 100vw"
              />
            </div>
            <div className="porque-txt">
              <div className="eyebrow"><b>02</b>El nombre</div>
              <h2>¿Por qué BROT 74?</h2>
              <p>
                Buscábamos una palabra que hablara de pan y tuviera identidad propia. Brot significa pan en alemán,
                y en Alemania el pan es cultura, tradición y vida cotidiana.
              </p>
            </div>
            {/* v61: el 74% sale del texto y pasa a ser hermano en la grilla (junto a la foto de masa madre
               en desktop); el cierre "Así de simple. Como el pan." va aparte, sobrio. */}
            <div className="porque-num">
              <div className="num">
                <strong>74<small>%</small></strong>
                <p>Nuestra identidad está en ese número: es la hidratación de nuestra masa madre.</p>
              </div>
            </div>
            <figure className="mm">
              <Media
                src="/assets/landing-masamadre.webp"
                alt="Masa madre estirándose en hilos al levantar la tapa del frasco"
                sizes="(min-width: 861px) 40vw, 100vw"
              />
              <figcaption>Nuestra masa madre</figcaption>
            </figure>
            <div className="cierre">
              <p><span>Así de simple.</span><span>Como el pan.</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo pedir */}
      <section id="pedir">
        <div className="wrap">
          <div className="grid">
            <div className="pedir-txt">
              <div className="eyebrow"><b>03</b>Cómo pedir</div>
              <h2>Pedís hoy, retirás cuando esté listo.</h2>
              <p>
                Somos una micropanadería: horneamos pocos panes, por tandas y para fechas fijas. Por eso trabajamos
                con pedidos anticipados. Así tu BROT lo retirás recién hecho.
              </p>
              <ol className="steps">
                {STEPS.map((s) => (
                  <li key={s.n} className="step">
                    <span className="step-n">{s.n}</span>
                    <div>
                      <h3>{s.t}</h3>
                      <p>{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="pedir-img">
              <Media
                src="/assets/landing-retiro.png"
                alt="Bolsa kraft con panes lista para retirar"
                sizes="(min-width: 861px) 40vw, 100vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer (v60): crema, sello navy, "Dónde" + "Seguinos" */}
      <footer className="ft" id="contacto">
        <div className="wrap">
          <div className="ft-top">
            <div className="ft-brand">
              <Image src="/ramillete-mono-navy.png" alt="BROT 74" width={832} height={1295} />
              <p>Micropanadería de masa madre.</p>
            </div>
            <dl className="ft-info">
              <div>
                <dt>Dónde</dt>
                <dd>Mendiolaza · Córdoba</dd>
              </div>
              <div>
                <dt>Seguinos</dt>
                <dd><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">@brot.74</a></dd>
              </div>
            </dl>
          </div>
          <div className="f-legal">
            <span>© 2026 BROT 74</span>
            <span>Harinas, agua y sal</span>
          </div>
        </div>
      </footer>

      {/* Barra mobile (≤860px): aparece cuando el botón del hero sale de pantalla */}
      <div className="mbar" ref={mbarRef}>
        <a className="ig" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <InstagramIcon strokeWidth={1.8} />
        </a>
        <StatusButton open={status.open} onClick={onReservar} />
      </div>
    </div>
  );
}
