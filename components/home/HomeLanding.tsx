"use client";

import Image from "next/image";
import "./HomeLanding.css";

interface HomeLandingProps {
  onReservar: () => void;
}

// BRT-136: landing pública nueva (v31) — reemplaza el home entero
// (view === "home" en app/page.tsx). Conversión a React de
// _design/design_cambios_v31/pantallas_actualizadas/landing.html,
// respetando estructura y copy del diseño entregado (ver CAMBIOS.md /
// manifest.json en esa carpeta). Cambios respecto del HTML estático,
// todos pedidos explícitamente en el ticket:
// - El pill "Elegí tu BROT" es un <button onClick={onReservar}> que usa
//   el router del sitio (buildFlowUrl de BRT-95), no un <a href> a
//   https://brot74.com/?step=slots hardcodeado.
// - Los typos heredados del copy original ("trasnferencia" ×2,
//   "conuna") están corregidos, así como los "¿" faltantes en
//   "¿Por qué BROT 74?" y "¿Y el 74?".
// - Las fotos van con next/image en vez de <img> planas.
export default function HomeLanding({ onReservar }: HomeLandingProps) {
  return (
    <div className="brot-landing">
      {/* Hero */}
      <header className="hero">
        <div className="hero-bg">
          <Image
            src="/assets/landing-hero.webp"
            alt="Pan de masa madre recién horneado"
            fill
            style={{ objectFit: "cover" }}
            sizes="100vw"
            priority
          />
        </div>
        <div className="hero-card">
          <div>
            <div className="rule"></div>
            <h1 className="hero-title">
              BROT
              <br />
              <span style={{ color: "#C8851A" }}>74</span>
            </h1>
          </div>
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "1.76px",
              textTransform: "uppercase",
              marginBottom: "clamp(20px,6vh,72px)",
            }}
          >
            Panes de fermentación natural, como debe ser
          </div>
        </div>
      </header>

      {/* Rail: position:fixed tanto en desktop como en mobile (queda
         flotante siempre visible mientras se scrollea, como en la
         referencia tobrod.dk) — el orden en el DOM no importa porque
         nunca pasa a position:static. El bloque va igual después del
         hero en el markup (antes importaba para el fallback en flujo
         que se probó y se descartó por UX). Ver HomeLanding.css. */}
      <div className="social">
        <a
          href="https://www.instagram.com/brot.74"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
        >
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="5"></rect>
              <circle cx="12" cy="12" r="5"></circle>
              <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"></circle>
            </svg>
          </span>
        </a>
        <button type="button" className="pill" onClick={onReservar}>
          Elegí tu BROT
        </button>
      </div>

      {/* Idea */}
      <section className="wrap">
        <div className="grid">
          <div>
            <div className="media tall media-bleed">
              <Image
                src="/assets/landing-idea-1.webp"
                alt=""
                fill
                style={{ objectFit: "cover" }}
                sizes="(min-width: 820px) 50vw, 100vw"
              />
            </div>
            <div className="rule" style={{ margin: "30px 0" }}></div>
            <h2>Idea</h2>
            <p>
              El concepto es básico: pocos panes, elaborados con
              productos naturales, sin conservantes ni aditivos. Y el
              tiempo como parte fundamental del proceso.
            </p>
            <p>
              Harinas, agua y sal.
              <br />
              <br />
            </p>
          </div>
          <div className="offset">
            <div className="media media-bleed">
              <Image
                src="/assets/landing-idea-2.webp"
                alt=""
                fill
                style={{ objectFit: "cover" }}
                sizes="(min-width: 820px) 39vw, 100vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Por qué BROT 74 */}
      <section className="wrap" style={{ paddingTop: "clamp(90px,13vh,190px)" }}>
        <div className="grid">
          {/* porque-media: en mobile este bloque pasa a estar DESPUÉS del
             texto ("order" de CSS Grid, ver HomeLanding.css) — pedido
             explícito del usuario, la imagen va después de "Así de
             simple. Como el pan." solo en mobile. En desktop no cambia
             nada, sigue siendo la columna izquierda del grid. El
             aspect-ratio/width de esta foto (antes inline) se movieron
             a HomeLanding.css (.porque-media .media) porque un estilo
             inline tiene más especificidad que cualquier regla de CSS
             y hubiera bloqueado el override de "media-bleed" en
             mobile. */}
          <div className="porque-media">
            <div className="media media-bleed">
              <Image
                src="/assets/landing-porque.webp"
                alt=""
                fill
                style={{ objectFit: "cover" }}
                sizes="(min-width: 820px) 36vw, 72vw"
              />
            </div>
          </div>
          <div>
            <div className="rule block-rule"></div>
            <h2>
              ¿Por qué <span style={{ color: "#C8851A" }}>BROT 74?</span>
            </h2>
            <dl className="day">
              <dd>
                BROT 74 nace de una idea simple: encontrar una palabra
                que conectara con la cultura del pan y que, al mismo
                tiempo, tuviera una identidad propia.
              </dd>
            </dl>
            <p>
              Brot significa pan en alemán. Y si hay un país donde el
              pan forma parte de la cultura, la tradición y la vida
              cotidiana, ese es Alemania.
            </p>
            <dl className="day">
              <dt>
                ¿Y el <span style={{ color: "#C8851A" }}>74?</span>
              </dt>
              <dd>
                Nuestra identidad está en ese número. 74% es la
                hidratación de nuestra masa madre.
              </dd>
            </dl>
            <p>Así de simple. Como el pan.</p>
          </div>
        </div>
      </section>

      {/* Pedís hoy, retirás cuando esté listo */}
      {/* paddingBottom explícito: es la última sección antes del
         footer, así que necesita su PROPIO aire abajo (las secciones
         anteriores no lo necesitan porque la siguiente sección aporta
         el espacio con su paddingTop). Mismo bug de especificidad de
         siempre (.wrap le gana a section y pisa el padding vertical a
         0) — sin esto la línea del footer queda pegada contra
         "Horarios de entregas". */}
      <section className="wrap" style={{ paddingTop: "clamp(56px,8vh,110px)", paddingBottom: "clamp(56px,9vh,132px)" }}>
        <div className="grid">
          <div>
            <div className="rule block-rule"></div>
            <h2>
              Pedís hoy, retirás cuando esté listo
            </h2>
            <ol className="steps">
              <li className="step">
                <span className="step-n">0<b>1</b></span>
                <h4 className="step-t">Elegí tu BROT</h4>
                <p className="step-d">
                  Elegís la fecha y armás tu pedido online, según lo que
                  haya disponible para esa tanda.
                </p>
              </li>
              <li className="step">
                <span className="step-n">0<b>2</b></span>
                <h4 className="step-t">Pagá por transferencia</h4>
                <p className="step-d">
                  Confirmás con una transferencia. Sin filas, sin efectivo,
                  a tu ritmo.
                </p>
              </li>
              <li className="step">
                <span className="step-n">0<b>3</b></span>
                <h4 className="step-t">Retirá en tu horario</h4>
                <p className="step-d">
                  Pasás a buscarlo en el lugar y la franja horaria de la
                  fecha. Horneamos por tandas, no hay local abierto.
                </p>
              </li>
            </ol>
            {/* Pedido explícito: "Horarios de entregas" se movió acá desde
               el footer, sin cambiar tamaño ni color — sigue siendo el
               mismo bloque (className="foot-col", mismo style inline),
               así que sigue matcheando la regla .foot-col h3 en CSS tal
               cual estaba. Se sacaron los <br/> de relleno que tenía el
               párrafo anterior (eran aire antes del footer; acá generaban
               un salto raro antes de este bloque). */}
            <div className="foot-col" style={{ marginTop: "clamp(28px,4.5vw,56px)", borderTop: "1px solid color-mix(in srgb, var(--navy) 28%, transparent)", paddingTop: "clamp(18px,2.4vw,30px)" }}>
              <h3>
                Horarios de <span style={{ color: "#C8851A" }}>entregas</span>
              </h3>
              <ul>
                <li>Miércoles: desde las 18:00 horas</li>
                <li>Sábados: desde las 18:00 horas</li>
              </ul>
            </div>
          </div>
          <div className="retiro-col">
            {/* media-bleed: pedido explícito, SOLO en mobile esta foto
               también va a sangre (de punta a punta), igual que las de
               "Idea" y "¿Por qué BROT 74?". Desktop no se toca — ahí
               sigue a su tamaño real (481px). Ver HomeLanding.css. */}
            <div className="media retiro-media media-bleed">
              <Image
                src="/assets/landing-retiro.png"
                alt="Bolsa kraft con panes lista para retirar"
                fill
                style={{ objectFit: "cover" }}
                sizes="(min-width: 820px) 481px, 100vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="wrap" id="contacto">
        <div className="grid">
          {/* Pedido explícito: logo más chico y centrado junto con el
             subtítulo "Micropanadería de Masa Madre" (antes: alineados
             a la izquierda, logo más grande). textAlign:center en el
             contenedor centra el <p> de texto; el logo (display:block)
             necesita además su propio margin:auto para centrarse. */}
          <div style={{ gridColumn: "1 / -1", textAlign: "center" }}>
            <div className="foot-brand" style={{ marginBottom: 0 }}>
              <Image
                src="/assets/logo-sello-mono-navy-transparente.png"
                alt="BROT 74"
                width={2400}
                height={2400}
                style={{ width: "clamp(80px,9vw,120px)", height: "auto", display: "block", margin: "0 auto" }}
              />
            </div>
            <div className="foot-note" style={{ marginTop: "18px" }}>
              Micropanadería de Masa Madre
            </div>
            <div className="foot-place">Mendiolaza, Córdoba</div>
          </div>
        </div>
        <div className="legal"></div>
      </footer>
    </div>
  );
}
