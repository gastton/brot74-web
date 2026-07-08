"use client";

import { useEffect } from "react";

const styles = `

  :root{
    --paper: #ECE6D6;
    --paper-raised: #F5F0E4;
    --ink: #1E2430;
    --ink-soft: #4A4F5C;
    --navy: #16233C;
    --navy-2: #1F3155;
    --amber: #B87A32;
    --amber-strong: #96601F;
    --crust: #A8562F;
    --line: #C9BFA4;
    --line-strong: #A79C7E;
    --accent-glow: rgba(184,122,50,0.18);

    --font-display: ui-serif, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
    --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --font-mono: ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace;

    color-scheme: light dark;
  }
  :root{
    --wm-img: url('/ramillete-cream-ink.png');
  }

  @media (prefers-color-scheme: dark){
    :root{
      --paper: #10151F;
      --paper-raised: #171E2C;
      --ink: #ECE6D6;
      --ink-soft: #B9B2A0;
      --navy: #0B111C;
      --navy-2: #16233C;
      --amber: #D99C4F;
      --amber-strong: #E7B26C;
      --crust: #C97A50;
      --line: #303A4E;
      --line-strong: #47536B;
      --accent-glow: rgba(217,156,79,0.16);
    }
  }
  :root[data-theme="dark"]{
    --paper: #10151F;
    --paper-raised: #171E2C;
    --ink: #ECE6D6;
    --ink-soft: #B9B2A0;
    --navy: #0B111C;
    --navy-2: #16233C;
    --amber: #D99C4F;
    --amber-strong: #E7B26C;
    --crust: #C97A50;
    --line: #303A4E;
    --line-strong: #47536B;
    --accent-glow: rgba(217,156,79,0.16);
  }
  :root[data-theme="light"]{
    --paper: #ECE6D6;
    --paper-raised: #F5F0E4;
    --ink: #1E2430;
    --ink-soft: #4A4F5C;
    --navy: #16233C;
    --navy-2: #1F3155;
    --amber: #B87A32;
    --amber-strong: #96601F;
    --crust: #A8562F;
    --line: #C9BFA4;
    --line-strong: #A79C7E;
    --accent-glow: rgba(184,122,50,0.18);
  }

  *{ box-sizing: border-box; }
  html,body{ margin:0; padding:0; }
  body{
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-body);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  ::selection{ background: var(--amber); color: var(--navy); }

  a{ color: var(--amber-strong); }

  .wrap{
    max-width: 980px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* background blueprint grid, very subtle */
  .grid-bg{
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle at 1px 1px, var(--line) 1px, transparent 1px);
    background-size: 28px 28px;
    opacity: 0.35;
    pointer-events: none;
  }

  /* ---------- header ---------- */
  header.top{
    position: sticky;
    top: 0;
    z-index: 30;
    background: color-mix(in srgb, var(--paper) 88%, transparent);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--line);
  }
  .top-inner{
    display:flex;
    align-items:center;
    justify-content: space-between;
    padding: 14px 24px;
    max-width: 980px;
    margin: 0 auto;
  }
  .brand{
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .brand strong{ color: var(--ink); }

  .lang-toggle{
    display: flex;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    overflow: hidden;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
  }
  .lang-toggle button{
    background: transparent;
    border: none;
    color: var(--ink-soft);
    padding: 6px 14px;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }
  .lang-toggle button.active{
    background: var(--navy);
    color: var(--paper-raised);
  }
  :root[data-theme="dark"] .lang-toggle button.active,
  @media (prefers-color-scheme: dark){
    .lang-toggle button.active{ background: var(--amber); color: var(--navy); }
  }
  .lang-toggle button:focus-visible,
  button:focus-visible, a:focus-visible{
    outline: 2px solid var(--amber-strong);
    outline-offset: 2px;
  }

  /* ---------- hero ---------- */
  .hero{
    position: relative;
    overflow: hidden;
    padding: 76px 0 56px;
    border-bottom: 1px solid var(--line);
  }
  .proceso-watermark{
    position: absolute;
    z-index: 0;
    top: 4%;
    right: -3%;
    width: 300px;
    max-width: 34%;
    aspect-ratio: 705 / 1145;
    background-color: var(--crust);
    opacity: 0.14;
    -webkit-mask-image: var(--wm-img);
    mask-image: var(--wm-img);
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center top;
    mask-position: center top;
    pointer-events: none;
  }
  :root[data-theme="dark"] .proceso-watermark{ opacity: 0.20; }
  :root[data-theme="light"] .proceso-watermark{ opacity: 0.14; }
  @media (prefers-color-scheme: dark){
    .proceso-watermark{ opacity: 0.20; }
  }
  @media (max-width: 760px){
    .proceso-watermark{ width: 190px; max-width: 50%; top: 2%; right: -8%; }
  }
  .hero-inner{
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1.35fr 0.9fr;
    gap: 48px;
    align-items: start;
  }
  .eyebrow{
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--crust);
    margin-bottom: 14px;
    display: block;
  }
  h1{
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(2.1rem, 4.4vw, 3.2rem);
    line-height: 1.08;
    letter-spacing: -0.01em;
    text-wrap: balance;
    margin: 0 0 20px;
    color: var(--ink);
  }
  h1 em{
    font-style: italic;
    color: var(--amber-strong);
  }
  .lede{
    font-size: 1.05rem;
    color: var(--ink-soft);
    max-width: 54ch;
    margin: 0 0 28px;
  }
  .stat-row{
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .stat-chip{
    font-family: var(--font-mono);
    font-size: 0.78rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    padding: 7px 11px;
    display: flex;
    gap: 6px;
    align-items: baseline;
    background: var(--paper-raised);
  }
  .stat-chip b{
    font-variant-numeric: tabular-nums;
    color: var(--amber-strong);
    font-size: 0.95rem;
  }

  /* docket card in hero */
  .docket{
    background: var(--paper-raised);
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    box-shadow: 0 18px 40px -22px rgba(0,0,0,0.35);
    font-family: var(--font-mono);
    font-size: 0.82rem;
    position: relative;
    overflow: visible;
  }
  .docket-head{
    background: var(--navy);
    color: var(--paper-raised);
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-radius: 4px 4px 0 0;
  }
  .docket-head span:first-child{ letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.72rem; }
  .docket-head span:last-child{ color: var(--amber); }
  .docket-icon{ display: inline-flex; align-items: center; gap: 6px; }
  .docket-icon img{ width: 16px; height: 16px; display: block; }
  .docket-body{ padding: 16px; }
  .docket-row{
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px dashed var(--line);
  }
  .docket-row:last-child{ border-bottom: none; }
  .docket-row .k{ color: var(--ink-soft); }
  .docket-row .v{ color: var(--ink); text-align: right; }

  /* ---------- sections ---------- */
  section{
    padding: 64px 0;
    border-bottom: 1px solid var(--line);
  }
  section:last-of-type{ border-bottom: none; }

  .section-head{
    position: relative;
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 40px;
  }
  #proceso{
    position: relative;
    overflow: hidden;
  }
  .section-num{
    font-family: var(--font-mono);
    color: var(--line-strong);
    font-size: 0.85rem;
  }
  h2{
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(1.5rem, 2.6vw, 2rem);
    margin: 0;
    text-wrap: balance;
  }
  .section-sub{
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--ink-soft);
    margin-top: 4px;
  }

  .reveal{
    opacity: 0;
    transform: translateY(14px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .reveal.in{ opacity: 1; transform: translateY(0); }
  @media (prefers-reduced-motion: reduce){
    .reveal{ opacity: 1; transform: none; transition: none; }
  }

  /* ---------- pipeline ---------- */
  .pipeline{
    position: relative;
    padding-left: 28px;
  }
  .pipeline::before{
    content: "";
    position: absolute;
    left: 5px;
    top: 8px;
    bottom: 8px;
    width: 1px;
    background: repeating-linear-gradient(to bottom, var(--line-strong) 0 6px, transparent 6px 11px);
  }
  .stage{
    position: relative;
    padding-bottom: 36px;
  }
  .stage:last-child{ padding-bottom: 0; }
  .stage::before{
    content: "";
    position: absolute;
    left: -28px;
    top: 4px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--paper);
    border: 2px solid var(--amber-strong);
  }
  .stage-head{
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }
  .stage-title{
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 500;
  }
  .stage-when{
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--crust);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .stage-desc{ color: var(--ink-soft); max-width: 62ch; }
  .stage-desc code{
    font-family: var(--font-mono);
    background: var(--accent-glow);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 0.88em;
  }

  /* ---------- comanda / ticket ---------- */
  .comanda-wrap{ display: flex; justify-content: center; }
  .comanda{
    width: 100%;
    max-width: 640px;
    background: var(--paper-raised);
    border: 1px solid var(--line-strong);
    position: relative;
    font-family: var(--font-mono);
    box-shadow: 0 24px 50px -28px rgba(0,0,0,0.4);
  }
  .perf{
    height: 14px;
    background-image: radial-gradient(circle at center, var(--paper) 4px, transparent 4.5px);
    background-size: 20px 14px;
    background-position: 10px center;
    background-repeat: repeat-x;
    border-bottom: 1px dashed var(--line-strong);
  }
  .comanda-inner{ padding: 26px 28px 30px; }
  .comanda-title{
    text-align: center;
    font-family: var(--font-display);
    font-size: 1.3rem;
    margin: 0 0 2px;
  }
  .comanda-sub{
    text-align: center;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-bottom: 20px;
  }
  .comanda-cat{
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--crust);
    margin: 18px 0 8px;
  }
  .comanda-cat:first-of-type{ margin-top: 0; }
  .comanda-line{
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 0.86rem;
    padding: 3px 0;
  }
  .comanda-line .name{ white-space: nowrap; color: var(--ink); }
  .comanda-line .dots{
    flex: 1;
    border-bottom: 1px dotted var(--line-strong);
    transform: translateY(-4px);
  }
  .comanda-line .tag{ color: var(--ink-soft); white-space: nowrap; font-size: 0.8rem; }
  .comanda-total{
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid var(--line-strong);
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }
  .comanda-total b{ color: var(--amber-strong); }

  /* ---------- highlights ---------- */
  .cards{
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
  }
  @media (max-width: 640px){ .cards{ grid-template-columns: 1fr; } }
  .card{
    background: var(--paper-raised);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 20px 22px;
  }
  .card-tag{
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--amber-strong);
    display: block;
    margin-bottom: 8px;
  }
  .card h3{
    font-family: var(--font-display);
    font-weight: 500;
    font-size: 1.05rem;
    margin: 0 0 8px;
  }
  .card p{ color: var(--ink-soft); font-size: 0.92rem; margin: 0; }

  /* ---------- footer ---------- */
  footer{
    position: relative;
    overflow: hidden;
    padding: 48px 0 70px;
    text-align: center;
  }
  footer .close-line{
    position: relative;
    font-family: var(--font-display);
    font-size: 1.25rem;
    max-width: 44ch;
    margin: 0 auto 20px;
    text-wrap: balance;
  }
  .footer-watermark{
    position: absolute;
    z-index: 0;
    top: 50%;
    left: 6%;
    width: 120px;
    max-width: 22%;
    aspect-ratio: 705 / 1145;
    transform: translateY(-50%);
    background-color: var(--crust);
    opacity: 0.20;
    -webkit-mask-image: var(--wm-img);
    mask-image: var(--wm-img);
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
    pointer-events: none;
  }
  :root[data-theme="dark"] .footer-watermark{ opacity: 0.26; }
  :root[data-theme="light"] .footer-watermark{ opacity: 0.20; }
  @media (prefers-color-scheme: dark){
    .footer-watermark{ opacity: 0.26; }
  }
  @media (max-width: 760px){
    .footer-watermark{
      position: static;
      display: block;
      width: 70px;
      max-width: none;
      margin: 0 auto 14px;
      transform: none;
    }
  }

  @media (max-width: 760px){
    .hero-inner{ grid-template-columns: 1fr; }
  }
`;

const content = `
<div class="grid-bg"></div>

<header class="top">
  <div class="top-inner">
    <span class="brand"><strong>BROT 74</strong> — <span data-es="caso de estudio" data-en="case study">caso de estudio</span></span>
    <div class="lang-toggle" role="group" aria-label="Idioma / Language">
      <button type="button" id="btn-es" class="active" onclick="setLang('es')">ES</button>
      <button type="button" id="btn-en" onclick="setLang('en')">EN</button>
    </div>
  </div>
</header>

<main class="wrap">

  <section class="hero">
    
    <div class="hero-inner">
      <div>
        <span class="eyebrow" data-es="De la idea a producción" data-en="From idea to production">De la idea a producción</span>
        <h1 data-es='Un sitio de venta de pan artesanal, construido de punta a punta con <em>IA como parte del equipo</em>.' data-en='An artisan bread ordering site, built end to end with <em>AI as part of the team</em>.'>Un sitio de venta de pan artesanal, construido de punta a punta con <em>IA como parte del equipo</em>.</h1>
        <p class="lede" data-es="brot74.com es un e-commerce de pre-venta de pan con reserva de stock, fechas de entrega y panel de administración. Todo el diseño, la implementación, el testing y el pipeline de CI se hicieron trabajando junto a Claude." data-en="brot74.com is a pre-order bakery e-commerce with stock reservations, delivery dates and an admin panel. Design, implementation, testing and the CI pipeline were all built working alongside Claude.">brot74.com es un e-commerce de pre-venta de pan con reserva de stock, fechas de entrega y panel de administración. Todo el diseño, la implementación, el testing y el pipeline de CI se hicieron trabajando junto a Claude.</p>
        <div class="stat-row">
          <span class="stat-chip"><b>90</b> <span data-es="commits" data-en="commits">commits</span></span>
          <span class="stat-chip"><b>~46</b> <span data-es="días, idea → prod" data-en="days, idea → prod">días, idea → prod</span></span>
          <span class="stat-chip"><b>1</b> <span data-es="design system desde cero" data-en="design system from scratch">design system desde cero</span></span>
          <span class="stat-chip"><b>19</b> <span data-es="iteraciones de UI" data-en="UI iterations">iteraciones de UI</span></span>
          <span class="stat-chip"><b>17</b> <span data-es="suites de integración" data-en="integration suites">suites de integración</span></span>
          <span class="stat-chip"><b>87</b> <span data-es="casos de prueba" data-en="test cases">casos de prueba</span></span>
          <span class="stat-chip"><b>7</b> <span data-es="modelos de dominio" data-en="domain models">modelos de dominio</span></span>
        </div>
      </div>

      <div class="docket">
        <div class="docket-head">
          <span data-es="Orden de trabajo" data-en="Work order">Orden de trabajo</span>
        <span class="docket-icon"><img src="/favicon/favicon-32.png" alt="" /> BRT-01</span>
        </div>
        <div class="docket-body">
          <div class="docket-row"><span class="k" data-es="Proyecto" data-en="Project">Proyecto</span><span class="v">brot74.com</span></div>
          <div class="docket-row"><span class="k" data-es="Rol" data-en="Role">Rol</span><span class="v" data-es="Dev + producto" data-en="Dev + product">Dev + producto</span></div>
          <div class="docket-row"><span class="k" data-es="Compañero IA" data-en="AI teammate">Compañero IA</span><span class="v">Claude Code</span></div>
          <div class="docket-row"><span class="k" data-es="Diseño UI" data-en="UI design">Diseño UI</span><span class="v">Claude</span></div>
          <div class="docket-row"><span class="k" data-es="Logo" data-en="Logo">Logo</span><span class="v">Gemini + ChatGPT</span></div>
          <div class="docket-row"><span class="k" data-es="Período" data-en="Period">Período</span><span class="v">05/2026 – 07/2026</span></div>
          <div class="docket-row"><span class="k" data-es="Dedicación" data-en="Commitment">Dedicación</span><span class="v" data-es="part-time → full-time (últ. 2 sem.)" data-en="part-time → full-time (last 2 wks)">part-time → full-time (últ. 2 sem.)</span></div>
          <div class="docket-row"><span class="k" data-es="Estado" data-en="Status">Estado</span><span class="v" data-es="en producción" data-en="in production">en producción</span></div>
        </div>
      </div>
    </div>
  </section>

  <section id="proceso">
    <div class="proceso-watermark" aria-hidden="true"></div>
    <div class="section-head">
      <span class="section-num">01</span>
      <div>
        <h2 data-es="El proceso" data-en="The process">El proceso</h2>
        <div class="section-sub" data-es="cinco etapas, un mismo hilo de trabajo con IA" data-en="five stages, one continuous AI-assisted workflow">cinco etapas, un mismo hilo de trabajo con IA</div>
      </div>
    </div>

    <div class="pipeline">
      <div class="stage reveal">
        <div class="stage-head">
          <span class="stage-title" data-es="Diseño ⇄ desarrollo, en loop" data-en="Design ⇄ development, in a loop">Diseño ⇄ desarrollo, en loop</span>
          <span class="stage-when" data-es="19 versiones · v1 → v24" data-en="19 versions · v1 → v24">19 versiones · v1 → v24</span>
        </div>
        <p class="stage-desc" data-es="Antes de tocar código se diseñó desde cero un design system propio para BROT 74: tipografía, paleta, componentes y sellos. Cada cambio de UI nació después como un export de diseño (Claude) y se tradujo a código con Claude Code en el mismo ciclo: hero, selector de fechas, modal de producto, checkout. El logo se generó aparte con Gemini y ChatGPT. No fue un diseño único ‘entregado’ — fueron <code>19</code> iteraciones documentadas en el historial de commits." data-en="Before writing any code, a design system for BROT 74 was built from scratch: typography, palette, components and seals. Every UI change then started as a design export (Claude) and was translated into code with Claude Code in the same cycle: hero, date selector, product modal, checkout. The logo was generated separately with Gemini and ChatGPT. Not a single ‘handed-off’ design — <code>19</code> iterations documented across the commit history.">Antes de tocar código se diseñó desde cero un design system propio para BROT 74: tipografía, paleta, componentes y sellos. Cada cambio de UI nació después como un export de diseño (Claude) y se tradujo a código con Claude Code en el mismo ciclo: hero, selector de fechas, modal de producto, checkout. El logo se generó aparte con Gemini y ChatGPT. No fue un diseño único 'entregado' — fueron <code>19</code> iteraciones documentadas en el historial de commits.</p>
      </div>

      <div class="stage reveal">
        <div class="stage-head">
          <span class="stage-title" data-es="Desarrollo asistido por IA" data-en="AI-assisted development">Desarrollo asistido por IA</span>
          <span class="stage-when" data-es="mayo → julio 2026 · part-time → full-time" data-en="May → July 2026 · part-time → full-time">mayo → julio 2026 · part-time → full-time</span>
        </div>
        <p class="stage-desc" data-es="Desde el scaffold inicial (<code>create-next-app</code>) hasta la lógica de negocio: reserva de stock con TTL, fechas de entrega con cupo, panel de admin, autenticación, upload de imágenes. Migración de SQLite a PostgreSQL en la primera semana. Arrancó part-time y pasó a full-time en las últimas dos semanas." data-en="From the initial scaffold (<code>create-next-app</code>) to the business logic: TTL-based stock reservation, capacity-limited delivery dates, admin panel, authentication, image uploads. SQLite → PostgreSQL migration in the first week. Started part-time, then shifted to full-time over the final two weeks.">Desde el scaffold inicial (<code>create-next-app</code>) hasta la lógica de negocio: reserva de stock con TTL, fechas de entrega con cupo, panel de admin, autenticación, upload de imágenes. Migración de SQLite a PostgreSQL en la primera semana. Arrancó part-time y pasó a full-time en las últimas dos semanas.</p>
      </div>

      <div class="stage reveal">
        <div class="stage-head">
          <span class="stage-title" data-es="Gestión por tickets" data-en="Ticket-driven workflow">Gestión por tickets</span>
          <span class="stage-when" data-es="Jira (BRT) · branch por ticket" data-en="Jira (BRT) · branch per ticket">Jira (BRT) · branch por ticket</span>
        </div>
        <p class="stage-desc" data-es="Los bugs y features se rastrean en Jira (proyecto <code>BRT</code>). Cada ticket vive en su propia rama y termina en un PR contra <code>main</code>; los bugs que aparecen en el camino se resuelven en el mismo PR si están relacionados." data-en="Bugs and features are tracked in Jira (project <code>BRT</code>). Each ticket lives on its own branch and lands as a PR against <code>main</code>; bugs found along the way are fixed in that same PR when related.">Los bugs y features se rastrean en Jira (proyecto <code>BRT</code>). Cada ticket vive en su propia rama y termina en un PR contra <code>main</code>; los bugs que aparecen en el camino se resuelven en el mismo PR si están relacionados.</p>
      </div>

      <div class="stage reveal">
        <div class="stage-head">
          <span class="stage-title" data-es="Testing en 4 etapas" data-en="Testing in 4 stages">Testing en 4 etapas</span>
          <span class="stage-when" data-es="Vitest + Postgres en Docker" data-en="Vitest + dockerized Postgres">Vitest + Postgres en Docker</span>
        </div>
        <p class="stage-desc" data-es="Cobertura de integración priorizada por riesgo: primero carrito/órdenes/entregas, después admin, después catálogo/auth, por último waitlist/uploads/cron. <code>17</code> suites y <code>87</code> casos de prueba corriendo contra una base real, no mocks." data-en="Integration coverage prioritized by risk: first cart/orders/delivery, then admin, then catalog/auth, finally waitlist/uploads/cron. <code>17</code> suites and <code>87</code> test cases running against a real database, not mocks.">Cobertura de integración priorizada por riesgo: primero carrito/órdenes/entregas, después admin, después catálogo/auth, por último waitlist/uploads/cron. <code>17</code> suites y <code>87</code> casos de prueba corriendo contra una base real, no mocks.</p>
      </div>

      <div class="stage reveal">
        <div class="stage-head">
          <span class="stage-title" data-es="CI/CD → producción" data-en="CI/CD → production">CI/CD → producción</span>
          <span class="stage-when" data-es="GitHub Actions → Vercel" data-en="GitHub Actions → Vercel">GitHub Actions → Vercel</span>
        </div>
        <p class="stage-desc" data-es="Cada PR corre lint y la suite de integración completa antes de poder mergear a <code>main</code>; ESLint es gate obligatorio. El merge dispara build y deploy en Vercel." data-en="Every PR runs lint and the full integration suite before it can merge to <code>main</code>; ESLint is a mandatory gate. Merging triggers build and deploy on Vercel.">Cada PR corre lint y la suite de integración completa antes de poder mergear a <code>main</code>; ESLint es gate obligatorio. El merge dispara build y deploy en Vercel.</p>
      </div>
    </div>
  </section>

  <section id="comanda">
    <div class="section-head">
      <span class="section-num">02</span>
      <div>
        <h2 data-es="La receta" data-en="The recipe">La receta</h2>
        <div class="section-sub" data-es="lo que efectivamente entró al horno" data-en="what actually went into the oven">lo que efectivamente entró al horno</div>
      </div>
    </div>

    <div class="comanda-wrap">
      <div class="comanda reveal">
        <div class="perf"></div>
        <div class="comanda-inner">
          <p class="comanda-title">BROT 74</p>
          <p class="comanda-sub" data-es="pila técnica" data-en="tech stack">pila técnica</p>

          <p class="comanda-cat" data-es="Producto" data-en="Product">Producto</p>
          <div class="comanda-line"><span class="name">Next.js 16 (App Router)</span><span class="dots"></span><span class="tag" data-es="frontend" data-en="frontend">frontend</span></div>
          <div class="comanda-line"><span class="name">React 19 · TypeScript</span><span class="dots"></span><span class="tag" data-es="UI" data-en="UI">UI</span></div>
          <div class="comanda-line"><span class="name">Tailwind CSS v4</span><span class="dots"></span><span class="tag" data-es="estilos" data-en="styling">estilos</span></div>

          <p class="comanda-cat" data-es="Datos" data-en="Data">Datos</p>
          <div class="comanda-line"><span class="name">PostgreSQL (Neon)</span><span class="dots"></span><span class="tag" data-es="base de datos" data-en="database">base de datos</span></div>
          <div class="comanda-line"><span class="name">Prisma ORM</span><span class="dots"></span><span class="tag" data-es="schema + migraciones" data-en="schema + migrations">schema + migraciones</span></div>
          <div class="comanda-line"><span class="name">Vercel Blob · Sharp</span><span class="dots"></span><span class="tag" data-es="imágenes" data-en="images">imágenes</span></div>

          <p class="comanda-cat" data-es="Calidad" data-en="Quality">Calidad</p>
          <div class="comanda-line"><span class="name">Vitest · Docker</span><span class="dots"></span><span class="tag" data-es="17 suites · 87 casos" data-en="17 suites · 87 cases">17 suites · 87 casos</span></div>
          <div class="comanda-line"><span class="name">ESLint 9</span><span class="dots"></span><span class="tag" data-es="gate en CI" data-en="CI gate">gate en CI</span></div>
          <div class="comanda-line"><span class="name">GitHub Actions</span><span class="dots"></span><span class="tag" data-es="CI/CD" data-en="CI/CD">CI/CD</span></div>

          <p class="comanda-cat" data-es="Inteligencia artificial" data-en="Artificial intelligence">Inteligencia artificial</p>
          <div class="comanda-line"><span class="name">Claude Code</span><span class="dots"></span><span class="tag" data-es="implementación" data-en="implementation">implementación</span></div>
          <div class="comanda-line"><span class="name">Claude</span><span class="dots"></span><span class="tag" data-es="diseño de pantallas" data-en="screen design">diseño de pantallas</span></div>
          <div class="comanda-line"><span class="name">Gemini + ChatGPT</span><span class="dots"></span><span class="tag" data-es="diseño de logo" data-en="logo design">diseño de logo</span></div>

          <p class="comanda-cat" data-es="Operación" data-en="Operations">Operación</p>
          <div class="comanda-line"><span class="name">Vercel</span><span class="dots"></span><span class="tag" data-es="hosting + deploy" data-en="hosting + deploy">hosting + deploy</span></div>
          <div class="comanda-line"><span class="name">Jira</span><span class="dots"></span><span class="tag" data-es="proyecto BRT" data-en="BRT project">proyecto BRT</span></div>

          <div class="comanda-total">
            <span data-es="Total de herramientas" data-en="Total tools">Total de herramientas</span>
            <b><span data-es="15, tres asistentes de IA" data-en="15, three AI assistants">15, tres asistentes de IA</span></b>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="decisiones">
    <div class="section-head">
      <span class="section-num">03</span>
      <div>
        <h2 data-es="Decisiones de ingeniería" data-en="Engineering decisions">Decisiones de ingeniería</h2>
        <div class="section-sub" data-es="detalles que no se ven, pero sostienen el producto" data-en="details you don't see, but that hold the product up">detalles que no se ven, pero sostienen el producto</div>
      </div>
    </div>

    <div class="cards">
      <div class="card reveal">
        <span class="card-tag" data-es="Inventario" data-en="Inventory">Inventario</span>
        <h3 data-es="Reserva de stock con TTL de 15 minutos" data-en="15-minute TTL stock reservation">Reserva de stock con TTL de 15 minutos</h3>
        <p data-es="El carrito reserva stock por tiempo limitado en vez de bloquearlo hasta el pago: evita overselling sin dejar productos ‘fantasma’ retenidos por carritos abandonados." data-en="The cart reserves stock for a limited time instead of locking it until payment: prevents overselling without leaving stock trapped by abandoned carts.">El carrito reserva stock por tiempo limitado en vez de bloquearlo hasta el pago: evita overselling sin dejar productos 'fantasma' retenidos por carritos abandonados.</p>
      </div>
      <div class="card reveal">
        <span class="card-tag" data-es="Imágenes" data-en="Images">Imágenes</span>
        <h3 data-es="Pipeline de optimización en el upload" data-en="Optimization pipeline on upload">Pipeline de optimización en el upload</h3>
        <p data-es="Cada imagen se procesa y comprime al subirla (Sharp) antes de ir a Vercel Blob, y se rechazan archivos corruptos antes de llegar al storage." data-en="Every image is processed and compressed on upload (Sharp) before reaching Vercel Blob, and corrupted files are rejected before they ever reach storage.">Cada imagen se procesa y comprime al subirla (Sharp) antes de ir a Vercel Blob, y se rechazan archivos corruptos antes de llegar al storage.</p>
      </div>
      <div class="card reveal">
        <span class="card-tag" data-es="Conversión" data-en="Conversion">Conversión</span>
        <h3 data-es="Waitlist por WhatsApp" data-en="WhatsApp waitlist">Waitlist por WhatsApp</h3>
        <p data-es="Cuando no hay fechas de entrega disponibles, el sitio no muestra un estado vacío mudo: pide el WhatsApp del cliente para avisar cuando se abra cupo." data-en="When no delivery dates are available, the site doesn't just show an empty state: it captures the customer's WhatsApp to notify them when a new slot opens.">Cuando no hay fechas de entrega disponibles, el sitio no muestra un estado vacío mudo: pide el WhatsApp del cliente para avisar cuando se abra cupo.</p>
      </div>
      <div class="card reveal">
        <span class="card-tag" data-es="Operación" data-en="Operations">Operación</span>
        <h3 data-es="Cron ajustado al plan real de hosting" data-en="Cron tuned to the real hosting plan">Cron ajustado al plan real de hosting</h3>
        <p data-es="La limpieza de reservas expiradas corre por cron; la frecuencia se ajustó a diario para funcionar dentro de los límites del plan Vercel Hobby, sin sorpresas de facturación." data-en="Expired-reservation cleanup runs on a cron job; frequency was tuned to daily to stay within Vercel's Hobby plan limits, with no billing surprises.">La limpieza de reservas expiradas corre por cron; la frecuencia se ajustó a diario para funcionar dentro de los límites del plan Vercel Hobby, sin sorpresas de facturación.</p>
      </div>
    </div>
  </section>

  <footer>
    <div class="footer-watermark" aria-hidden="true"></div>
    <p class="close-line reveal" data-es="No fue IA generando código al azar: fue un flujo de trabajo real — diseño, tickets, PRs, tests, CI — con la IA como parte del equipo, no como atajo." data-en="This wasn't AI generating code at random: it was a real workflow — design, tickets, PRs, tests, CI — with AI as part of the team, not a shortcut.">No fue IA generando código al azar: fue un flujo de trabajo real — diseño, tickets, PRs, tests, CI — con la IA como parte del equipo, no como atajo.</p>
  </footer>

</main>`;

type WindowWithLang = Window & { setLang?: (lang: string) => void };

export default function ComoSeHizoPage() {
  useEffect(() => {
    const win = window as WindowWithLang;

    function setLang(lang: string) {
      document.querySelectorAll("[data-es]").forEach((el) => {
        const es = el.getAttribute("data-es");
        const en = el.getAttribute("data-en");
        el.innerHTML = (lang === "es" ? es : en) ?? "";
      });
      document.getElementById("btn-es")?.classList.toggle("active", lang === "es");
      document.getElementById("btn-en")?.classList.toggle("active", lang === "en");
      document.documentElement.setAttribute("lang", lang);
    }
    win.setLang = setLang;

    let io: IntersectionObserver | undefined;
    const reveals = document.querySelectorAll(".reveal");
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      reveals.forEach((el) => io?.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add("in"));
    }

    return () => {
      io?.disconnect();
      delete win.setLang;
    };
  }, []);

  return (
    <>
      <style>{styles}</style>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </>
  );
}
