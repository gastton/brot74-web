"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generador de tarjetas de pan para WhatsApp/Instagram (1080×1350).
 *
 * Port 1:1 de la referencia on-brand del Design System
 * ("BROT 74/brot-card-app.jsx" + "brot-card-canvas.js" + su CSS acompañante
 * en "Plantilla Card WhatsApp BROT 74.html"): misma paleta navy/amber/cream,
 * misma tipografía Jost, mismo título auto-ajustable y mismo truncado con
 * elipsis del canvas (tamaños de título y de bullets ajustados a pedido:
 * título 52→46→40px, bullets más grandes).
 *
 * Diferencias intencionales respecto de esa referencia:
 * - La nota chica al pie usaba "Newsreader" itálica (fuente --editorial de
 *   la marca); acá va en Hanken Grotesk itálica, que ya carga el sitio,
 *   para no sumar una fuente nueva al bundle. Arranca vacía (no placeholder).
 * - El watermark usa el glifo real de Instagram (dibujado en canvas/SVG) en
 *   vez del isotipo de BROT 74, para que se lea como "seguinos en Instagram".
 * - La imagen default vive en /public/tarjetas/pan-default.webp.
 * - Se agregó el botón "✕ Cerrar" (prop onClose) para usarlo como overlay
 *   dentro de /admin/productos.
 */

const CANVAS_W = 1080;
const CANVAS_H = 1350;
const PHOTO_H = 810; // 60% de 1350 — ratio 4:3 sobre el ancho completo
const MARGIN = 60; // M — margen izquierdo/derecho del contenido
const LABEL_X = 84; // TX — x donde arranca cada bullet (después del punto)
const MAX_TITLE_WIDTH = CANVAS_W - 2 * MARGIN; // 960
const VALUE_WIDTH = CANVAS_W - LABEL_X - MARGIN; // 936

const NAVY = "#0E233C";
const AMBER = "#C8851A";
const CREAM = "#F4EEE2";
const STONE = "#7C766A";
const LINE = "#DDD3C2";
const PAPER = "#FBF8F2";

const LOGO_NAVY = "/ramillete-mono-navy.png";
const DEFAULT_IMAGE = "/tarjetas/pan-default.webp";

const JOST = "var(--font-jost, 'Jost', sans-serif)";
const HANKEN = "var(--font-hanken, 'Hanken Grotesk', sans-serif)";

type FitMode = "cover" | "contain";

interface RenderOptions {
  name: string;
  ingredients: string;
  ferment: string;
  weight: string;
  price: string;
  footnote: string;
  image: string;
  fit: FitMode;
  posY: number;
  showIg: boolean;
  handle: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("blob:") && !src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Wrap por palabra; si una palabra sola no entra, la parte letra por letra. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (ctx.measureText(t).width <= max) {
      cur = t;
    } else {
      if (cur) out.push(cur);
      if (ctx.measureText(w).width > max) {
        let p = "";
        for (const ch of w) {
          if (ctx.measureText(p + ch).width <= max) p += ch;
          else {
            if (p) out.push(p);
            p = ch;
          }
        }
        cur = p;
      } else {
        cur = w;
      }
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

/** Como wrapText, pero la primera línea usa un ancho distinto (el espacio libre al lado del label). */
function wrapTextIndent(ctx: CanvasRenderingContext2D, text: string, first: number, rest: number): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  let max = first;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const t = cur ? cur + " " + w : w;
    if (ctx.measureText(t).width <= max) {
      cur = t;
    } else if (cur) {
      out.push(cur);
      cur = "";
      max = rest;
      i--;
    } else {
      let p = "";
      for (const ch of w) {
        if (ctx.measureText(p + ch).width <= max) p += ch;
        else {
          if (p) {
            out.push(p);
            max = rest;
          }
          p = ch;
        }
      }
      cur = p;
      max = rest;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

function ellipsize(ctx: CanvasRenderingContext2D, line: string, max: number): string {
  let s = String(line).replace(/[\s,.;:]+$/, "") + "…";
  while (ctx.measureText(s).width > max && s.length > 2) {
    const t = s.slice(0, -2).replace(/[\s,.;:]+$/, "");
    s = t + "…";
  }
  return s;
}

function fitLines(ctx: CanvasRenderingContext2D, lines: string[], first: number, rest: number): string[] {
  return lines.map((ln, i) => {
    const max = i === 0 ? first : rest;
    return ctx.measureText(ln).width > max ? ellipsize(ctx, ln, max) : ln;
  });
}

function fitTitle(ctx: CanvasRenderingContext2D, name: string): { size: number; lh: number; lines: string[] } {
  const upper = (name || "").toUpperCase();
  for (const size of [52, 46, 40]) {
    ctx.font = `700 ${size}px Jost`;
    const lines = wrapText(ctx, upper, MAX_TITLE_WIDTH);
    if (lines.length <= 2) return { size, lh: Math.round(size * 1.07), lines };
  }
  ctx.font = "700 40px Jost";
  const lines = wrapText(ctx, upper, MAX_TITLE_WIDTH);
  return {
    size: 40,
    lh: 43,
    lines: [lines[0], lines.length > 2 ? ellipsize(ctx, lines[1], MAX_TITLE_WIDTH) : lines[1]].filter(
      Boolean
    ) as string[],
  };
}

function measureTitle(name: string): { size: number; lh: number; lines: string[] } {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return { size: 52, lh: 56, lines: [name] };
  return fitTitle(ctx, name);
}

function clipRoundedRect(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(CANVAS_W - r, 0);
  ctx.quadraticCurveTo(CANVAS_W, 0, CANVAS_W, r);
  ctx.lineTo(CANVAS_W, CANVAS_H - r);
  ctx.quadraticCurveTo(CANVAS_W, CANVAS_H, CANVAS_W - r, CANVAS_H);
  ctx.lineTo(r, CANVAS_H);
  ctx.quadraticCurveTo(0, CANVAS_H, 0, CANVAS_H - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.clip();
}

/** Glifo de Instagram (cuadrado redondeado + lente + punto), a mano — sin depender de un asset externo. */
function drawInstagramGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const s = size / 24; // escala respecto del viewBox de 24 unidades del ícono original
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6 * s;
  const pad = 1.5 * s,
    w = size - pad * 2,
    r = 5.5 * s;
  ctx.beginPath();
  ctx.moveTo(x + pad + r, y + pad);
  ctx.lineTo(x + pad + w - r, y + pad);
  ctx.quadraticCurveTo(x + pad + w, y + pad, x + pad + w, y + pad + r);
  ctx.lineTo(x + pad + w, y + pad + w - r);
  ctx.quadraticCurveTo(x + pad + w, y + pad + w, x + pad + w - r, y + pad + w);
  ctx.lineTo(x + pad + r, y + pad + w);
  ctx.quadraticCurveTo(x + pad, y + pad + w, x + pad, y + pad + w - r);
  ctx.lineTo(x + pad, y + pad + r);
  ctx.quadraticCurveTo(x + pad, y + pad, x + pad + r, y + pad);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, 4.6 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size - 6.25 * s, y + 6.25 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

async function ensureFontsReady() {
  if (!document.fonts) return;
  await Promise.all(
    ["700 52px Jost", "600 32px Jost", "400 30px Jost", "500 26px Jost", "600 48px Jost", "italic 400 24px 'Hanken Grotesk'"].map(
      (f) => document.fonts.load(f, "Pan de centeno 100% @brot.74").catch(() => {})
    )
  );
  await document.fonts.ready;
}

async function renderCard(o: RenderOptions): Promise<HTMLCanvasElement> {
  await ensureFontsReady();
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no ctx");

  ctx.save();
  clipRoundedRect(ctx, 40);
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  let photo: HTMLImageElement | null = null;
  try {
    photo = await loadImage(o.image);
  } catch {
    photo = null;
  }
  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_W, PHOTO_H);
    ctx.clip();
    if (o.fit === "cover") {
      const scale = Math.max(CANVAS_W / photo.width, PHOTO_H / photo.height);
      const w = photo.width * scale,
        h = photo.height * scale;
      ctx.drawImage(photo, (CANVAS_W - w) / 2, (PHOTO_H - h) * (o.posY / 100), w, h);
    } else {
      const scale = Math.min(CANVAS_W / photo.width, PHOTO_H / photo.height);
      const w = photo.width * scale,
        h = photo.height * scale;
      ctx.drawImage(photo, (CANVAS_W - w) / 2, (PHOTO_H - h) / 2, w, h);
    }
    ctx.restore();
  }

  ctx.textBaseline = "top";
  ctx.fillStyle = NAVY;
  let y = PHOTO_H + 48;
  const tf = fitTitle(ctx, o.name);
  ctx.font = `700 ${tf.size}px Jost`;
  for (const ln of fitLines(ctx, tf.lines, MAX_TITLE_WIDTH, MAX_TITLE_WIDTH)) {
    ctx.fillText(ln, MARGIN, y);
    y += tf.lh + 4;
  }
  y += 18;
  ctx.fillStyle = LINE;
  ctx.fillRect(MARGIN, y, MAX_TITLE_WIDTH, 2);
  y += 26;

  const LH = 38,
    GAP = 18;
  let footTop = CANVAS_H - 44;

  if (o.showIg) {
    const ICON = 30,
      ICON_GAP = 12;
    ctx.font = "500 26px Jost";
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "2.4px";
    const textW = ctx.measureText(o.handle).width;
    const total = ICON + ICON_GAP + textW;
    const startX = (CANVAS_W - total) / 2;
    const cy = footTop - 17;
    drawInstagramGlyph(ctx, startX, cy - ICON / 2, ICON, AMBER);
    ctx.textBaseline = "middle";
    ctx.fillStyle = AMBER;
    ctx.fillText(o.handle, startX + ICON + ICON_GAP, cy + 1);
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
    ctx.textBaseline = "top";
    footTop = cy - 17 - 26;
  }

  if (o.footnote) {
    const ny = footTop - 30;
    ctx.save();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(MARGIN, ny - 22);
    ctx.lineTo(CANVAS_W - MARGIN, ny - 22);
    ctx.stroke();
    ctx.restore();
    ctx.font = "italic 400 24px 'Hanken Grotesk'";
    ctx.fillStyle = STONE;
    ctx.fillText(o.footnote, MARGIN, ny);
    footTop = ny - 22;
  }

  const PRICE_H = 56;
  const budget = footTop - 20 - PRICE_H;
  const rows: { key: string; value: string }[] = [
    { key: "Ingredientes:", value: o.ingredients },
    { key: "Tiempo de fermentación:", value: o.ferment },
    { key: "Peso:", value: o.weight },
  ];

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const reserve = (rows.length - 1 - ri) * (LH + GAP);
    const room = Math.floor((budget - reserve - y) / LH);
    if (room < 1) break;

    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.arc(MARGIN + 5, y + 12, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "600 32px Jost";
    ctx.fillStyle = NAVY;
    const labelW = ctx.measureText(row.key).width;
    const firstW = VALUE_WIDTH - labelW - 14;
    ctx.font = "400 30px Jost";

    if (firstW < 120) {
      if (room < 2) {
        ctx.font = "600 32px Jost";
        ctx.fillText(row.key, LABEL_X, y);
        y += LH + GAP;
        continue;
      }
      ctx.font = "600 32px Jost";
      ctx.fillText(row.key, LABEL_X, y);
      y += LH;
      ctx.font = "400 30px Jost";
      ctx.fillStyle = NAVY;
      const all = wrapText(ctx, row.value || "—", VALUE_WIDTH);
      const cap = Math.min(3, room - 1);
      let lines = all.slice(0, cap);
      if (all.length > lines.length && lines.length) lines[lines.length - 1] = ellipsize(ctx, lines[lines.length - 1], VALUE_WIDTH);
      lines = fitLines(ctx, lines, VALUE_WIDTH, VALUE_WIDTH);
      lines.forEach((ln, i) => {
        ctx.fillText(ln, LABEL_X, y);
        if (i < lines.length - 1) y += LH;
      });
    } else {
      const all = wrapTextIndent(ctx, row.value || "—", firstW, VALUE_WIDTH);
      const cap = Math.min(3, room);
      let lines = all.slice(0, cap);
      if (all.length > lines.length && lines.length)
        lines[lines.length - 1] = ellipsize(ctx, lines[lines.length - 1], lines.length === 1 ? firstW : VALUE_WIDTH);
      lines = fitLines(ctx, lines, firstW, VALUE_WIDTH);
      ctx.font = "600 32px Jost";
      ctx.fillStyle = NAVY;
      ctx.fillText(row.key, LABEL_X, y);
      ctx.font = "400 30px Jost";
      ctx.fillStyle = NAVY;
      if (lines[0]) ctx.fillText(lines[0], LABEL_X + labelW + 14, y + 2);
      for (let i = 1; i < lines.length; i++) {
        y += LH;
        ctx.fillText(lines[i], LABEL_X, y + 2);
      }
    }
    y += LH + GAP;
  }

  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.arc(MARGIN + 5, y + 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "600 32px Jost";
  ctx.fillStyle = NAVY;
  const priceLabel = "Precio:";
  const priceLabelW = ctx.measureText(priceLabel).width;
  ctx.fillText(priceLabel, LABEL_X, y + 8);
  ctx.font = "600 48px Jost";
  ctx.fillStyle = AMBER;
  ctx.fillText(o.price || "—", LABEL_X + priceLabelW + 14, y);

  ctx.restore();
  return canvas;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block text-[10.5px] uppercase tracking-[0.15em] font-semibold mb-1.5"
        style={{ color: STONE }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <p className="text-[10.5px] mt-1.5 leading-[1.4]" style={{ color: STONE }}>
          {hint}
        </p>
      )}
    </label>
  );
}

function Bullet({ label, value, price }: { label: string; value: string; price?: boolean }) {
  return (
    <div className={`flex gap-3.5 text-[30px] leading-[1.27] ${price ? "items-baseline" : "items-start"}`}>
      <span
        className="w-[10px] h-[10px] rounded-full shrink-0"
        style={{ background: AMBER, marginTop: price ? undefined : 11 }}
      />
      <span className="font-semibold whitespace-nowrap text-[32px]" style={{ color: NAVY }}>
        {label}
      </span>
      {price ? (
        <span className="block font-semibold text-[48px] leading-none" style={{ color: AMBER }}>
          {value || "—"}
        </span>
      ) : (
        <span className="line-clamp-3" style={{ color: NAVY, opacity: 0.86 }}>
          {value || "—"}
        </span>
      )}
    </div>
  );
}

export default function BreadCardGenerator({ onClose }: { onClose?: () => void }) {
  const [name, setName] = useState("PAN DE CENTENO 100%");
  const [ingredients, setIngredients] = useState("Harinas de trigo integral, 000 y centeno. Semillas de girasol, chía y lino. Nueces.");
  const [fermentTime, setFermentTime] = useState("24hs en frío");
  const [weight, setWeight] = useState("750g");
  const [price, setPrice] = useState("$8.500");
  const [note, setNote] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<FitMode>("cover");
  const [verticalPos, setVerticalPos] = useState(50);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [showInstagramHandle, setShowInstagramHandle] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [resultMsg, setResultMsg] = useState("");
  const [scale, setScale] = useState(420 / CANVAS_W);
  const [titleFitState, setTitleFitState] = useState({ size: 52, lh: 56 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl);
    };
  }, [uploadedImageUrl]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setScale(entry.contentRect.width / CANVAS_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const f = measureTitle(name || "PAN DE CENTENO 100%");
        setTitleFitState({ size: f.size, lh: f.lh });
      } catch {
        /* noop */
      }
    }, 60);
    return () => clearTimeout(t);
  }, [name]);

  const displayImageUrl = uploadedImageUrl || DEFAULT_IMAGE;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl);
    setUploadedImageUrl(URL.createObjectURL(file));
    setStatusMsg(`Foto cargada: ${file.name}`);
  }

  const handleDownload = useCallback(async () => {
    setGenerating(true);
    setResultMsg("");
    setStatusMsg("Generando JPG 1080×1350…");
    try {
      const canvas = await renderCard({
        name,
        ingredients,
        ferment: fermentTime,
        weight,
        price,
        footnote: note,
        image: displayImageUrl,
        fit: fitMode,
        posY: verticalPos,
        showIg: showInstagramHandle,
        handle: "@brot.74",
      });
      const link = document.createElement("a");
      link.download = "brot74-card.jpg";
      link.href = canvas.toDataURL("image/jpeg", 0.92);
      link.click();
      setStatusMsg("");
      setResultMsg("JPG 1080×1350 descargado — brot74-card.jpg");
      setTimeout(() => setResultMsg(""), 6000);
    } catch (err) {
      console.error(err);
      setStatusMsg("Error al generar el JPG");
    } finally {
      setGenerating(false);
    }
  }, [name, ingredients, fermentTime, weight, price, note, displayImageUrl, fitMode, verticalPos, showInstagramHandle]);

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: NAVY, fontFamily: JOST }}>
      <header
        className="sticky top-0 z-10 backdrop-blur"
        style={{ borderBottom: `1px solid ${LINE}`, background: "rgba(251,248,242,.9)" }}
      >
        <div className="max-w-[1160px] mx-auto px-6 h-[60px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_NAVY} alt="BROT 74" className="h-[26px] w-auto block" />
            <span className="text-[12px] tracking-[0.22em] uppercase font-medium">Plantilla WhatsApp</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] tracking-[0.1em]" style={{ color: STONE }}>
              1080×1350 · Canvas nativo · sin estiramiento
            </span>
            {onClose && (
              <button onClick={onClose} className="text-[12px] font-semibold px-2 py-1 transition-colors" style={{ color: STONE }}>
                ✕ Cerrar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1160px] mx-auto px-6 py-8 md:py-10">
        <div className="flex flex-wrap items-baseline gap-5 mb-8">
          <h1 className="font-medium text-[32px] leading-none tracking-[-0.01em]" style={{ fontFamily: JOST }}>
            Card de producto <span style={{ color: AMBER }}>— 4 bullets</span>
          </h1>
          <p className="text-[13.5px] leading-[1.45] max-w-[44ch]" style={{ color: STONE }}>
            Editá los campos y descargá el JPG. El export usa Canvas nativo con COVER real: nunca estira la foto.
          </p>
        </div>

        <div className="flex flex-col gap-9 items-start lg:flex-row">
          {/* Editor */}
          <section className="w-full order-2 lg:w-[392px] lg:shrink-0 lg:order-1">
            <div className="bg-white rounded-[18px] p-5" style={{ border: `1px solid ${LINE}` }}>
              <h2 className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-[18px]" style={{ color: AMBER }}>
                Editor
              </h2>
              <div className="flex flex-col gap-[18px]">
                <Field label="Nombre del pan">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="PAN DE CENTENO 100%"
                    className="w-full rounded-[10px] px-3.5 py-2.5 text-[14px] font-medium uppercase tracking-[0.04em] outline-none transition-colors"
                    style={{ fontFamily: JOST, border: `1px solid ${LINE}`, background: PAPER, color: NAVY }}
                  />
                </Field>

                <Field label="Ingredientes" hint="Hace wrap hasta 3 líneas.">
                  <textarea
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    rows={4}
                    className="w-full rounded-[10px] px-3.5 py-2.5 text-[13.5px] leading-[1.45] outline-none resize-none transition-colors"
                    style={{ fontFamily: JOST, border: `1px solid ${LINE}`, background: PAPER, color: NAVY }}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fermentación">
                    <input
                      type="text"
                      value={fermentTime}
                      onChange={(e) => setFermentTime(e.target.value)}
                      className="w-full rounded-[10px] px-3.5 py-2.5 text-[14px] outline-none transition-colors"
                      style={{ fontFamily: JOST, border: `1px solid ${LINE}`, background: PAPER, color: NAVY }}
                    />
                  </Field>
                  <Field label="Peso">
                    <input
                      type="text"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full rounded-[10px] px-3.5 py-2.5 text-[14px] outline-none transition-colors"
                      style={{ fontFamily: JOST, border: `1px solid ${LINE}`, background: PAPER, color: NAVY }}
                    />
                  </Field>
                </div>

                <Field label="Precio">
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-[10px] px-3.5 py-2.5 text-[14px] outline-none transition-colors"
                    style={{ fontFamily: JOST, border: `1px solid ${LINE}`, background: PAPER, color: NAVY }}
                  />
                </Field>

                <Field label="Foto">
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 text-left rounded-[10px] px-3 py-2.5 text-[13px] font-medium hover:opacity-80 transition-opacity"
                      style={{ fontFamily: JOST, border: "1px dashed #C6B79C", background: "#fff", color: NAVY }}
                    >
                      {uploadedImageUrl ? "Cambiar foto…" : "Elegir archivo…"}
                    </button>
                    {uploadedImageUrl && (
                      <button
                        onClick={() => {
                          URL.revokeObjectURL(uploadedImageUrl);
                          setUploadedImageUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="rounded-[10px] px-3.5 text-[12px]"
                        style={{ fontFamily: JOST, background: NAVY, color: CREAM }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </Field>

                <div className="rounded-[12px] p-3.5 flex flex-col gap-4" style={{ background: CREAM, border: `1px solid ${LINE}` }}>
                  <div>
                    <span
                      className="block text-[10.5px] uppercase tracking-[0.15em] font-semibold mb-1.5"
                      style={{ color: STONE }}
                    >
                      Ajuste de imagen
                    </span>
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-white" style={{ border: `1px solid ${LINE}` }}>
                      <button
                        onClick={() => setFitMode("cover")}
                        className="h-8 rounded-full text-[12px] font-semibold tracking-[0.02em]"
                        style={{
                          fontFamily: JOST,
                          background: fitMode === "cover" ? NAVY : "transparent",
                          color: fitMode === "cover" ? CREAM : STONE,
                        }}
                      >
                        Cubrir
                      </button>
                      <button
                        onClick={() => setFitMode("contain")}
                        className="h-8 rounded-full text-[12px] font-semibold tracking-[0.02em]"
                        style={{
                          fontFamily: JOST,
                          background: fitMode === "contain" ? NAVY : "transparent",
                          color: fitMode === "contain" ? CREAM : STONE,
                        }}
                      >
                        Completa
                      </button>
                    </div>
                    <p className="text-[10.5px] mt-1.5 leading-[1.4]" style={{ color: STONE }}>
                      {fitMode === "cover"
                        ? "COVER real: recorta sin estirar. El slider mueve el encuadre vertical."
                        : "CONTAIN: entra completa, centrada sobre crema. Ideal para fotos verticales."}
                    </p>
                  </div>

                  {fitMode === "cover" && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10.5px] uppercase tracking-[0.15em] font-semibold" style={{ color: STONE }}>
                          Posición vertical
                        </span>
                        <span className="text-[11px] font-semibold" style={{ color: AMBER }}>
                          {verticalPos}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={verticalPos}
                        onChange={(e) => setVerticalPos(Number(e.target.value))}
                        className="brot-range w-full h-1.5"
                      />
                      <div className="flex justify-between text-[10px] mt-1" style={{ color: STONE }}>
                        <span>Arriba</span>
                        <span>Centro</span>
                        <span>Abajo</span>
                      </div>
                    </div>
                  )}

                  <label
                    className="flex items-center gap-2.5 cursor-pointer select-none rounded-[10px] bg-white px-3 py-2.5 text-[12.5px] font-medium"
                    style={{ border: `1px solid ${LINE}` }}
                  >
                    <input
                      type="checkbox"
                      checked={showSafeZone}
                      onChange={(e) => setShowSafeZone(e.target.checked)}
                      className="w-[15px] h-[15px] shrink-0"
                      style={{ accentColor: NAVY }}
                    />
                    <span>Ver zona segura</span>
                    <span className="ml-auto text-[11px] tracking-[0.06em]" style={{ color: STONE }}>
                      60px
                    </span>
                  </label>
                </div>

                <Field label="Nota chica (opcional)">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Pedidos hasta jueves 18hs"
                    className="w-full rounded-[10px] px-3.5 py-2.5 text-[14px] outline-none transition-colors"
                    style={{ fontFamily: JOST, border: `1px solid ${LINE}`, background: PAPER, color: NAVY }}
                  />
                </Field>

                <label
                  className="flex items-center gap-2.5 cursor-pointer select-none rounded-[10px] bg-white px-3 py-2.5 text-[12.5px] font-medium"
                  style={{ border: `1px solid ${LINE}` }}
                >
                  <input
                    type="checkbox"
                    checked={showInstagramHandle}
                    onChange={(e) => setShowInstagramHandle(e.target.checked)}
                    className="w-[15px] h-[15px] shrink-0"
                    style={{ accentColor: NAVY }}
                  />
                  <span>Mostrar Instagram</span>
                  <span className="ml-auto text-[11px] tracking-[0.06em]" style={{ color: STONE }}>
                    @brot.74
                  </span>
                </label>
              </div>

              <div className="mt-[22px] pt-5" style={{ borderTop: `1px solid ${LINE}` }}>
                <button
                  onClick={handleDownload}
                  disabled={generating}
                  className="w-full h-[46px] rounded-full text-[12.5px] font-semibold tracking-[0.12em] uppercase flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-default hover:opacity-90 transition-opacity"
                  style={{ fontFamily: JOST, background: NAVY, color: CREAM }}
                >
                  {generating ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(244,238,226,.3)", borderTopColor: CREAM }} />
                      Generando…
                    </>
                  ) : (
                    "Descargar JPG"
                  )}
                </button>
                <p className="text-[11px] text-center mt-2.5 tracking-[0.04em]" style={{ color: STONE }}>
                  1080×1350 · radio 40px · JPG 0.92
                </p>
                {statusMsg && (
                  <p className="mt-3 text-[11.5px] leading-[1.4] rounded-[8px] px-2.5 py-2" style={{ background: CREAM, color: NAVY }}>
                    {statusMsg}
                  </p>
                )}
                {resultMsg && (
                  <p
                    className="mt-3 text-[11.5px] leading-[1.4] rounded-[8px] px-2.5 py-2 font-semibold bg-white"
                    style={{ border: `1px solid ${AMBER}`, color: AMBER }}
                  >
                    {resultMsg}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Preview */}
          <section className="w-full order-1 flex flex-col items-center gap-3.5 lg:flex-1 lg:order-2 lg:sticky lg:top-[92px]">
            <div className="text-[10px] uppercase tracking-[0.2em] flex items-center gap-2" style={{ color: STONE }}>
              <span className="w-1 h-1 rounded-full" style={{ background: AMBER }} />
              Preview vivo · {fitMode === "cover" ? `Cubrir ${verticalPos}%` : "Completa"}
            </div>

            <div
              className="relative overflow-hidden rounded-[24px]"
              style={{ width: "min(420px, 92vw)", boxShadow: "0 24px 64px rgba(14,35,60,.14), 0 2px 8px rgba(14,35,60,.06)" }}
            >
              <div
                ref={frameRef}
                style={{ width: "100%", height: CANVAS_H * scale }}
              >
                <div
                  className="relative flex flex-col"
                  style={{
                    width: CANVAS_W,
                    height: CANVAS_H,
                    transformOrigin: "top left",
                    transform: `scale(${scale})`,
                    background: CREAM,
                  }}
                >
                  <div className="relative shrink-0 overflow-hidden" style={{ width: CANVAS_W, height: PHOTO_H, background: CREAM }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      // js/xss-through-dom false positive dismissed on GitHub: opaque blob: URL from URL.createObjectURL(file), or the static DEFAULT_IMAGE constant — never attacker-controlled text, not HTML
                      src={displayImageUrl}
                      alt=""
                      draggable={false}
                      className="w-full h-full block"
                      style={
                        fitMode === "cover"
                          ? { objectFit: "cover", objectPosition: `50% ${verticalPos}%` }
                          : { objectFit: "contain", objectPosition: "center" }
                      }
                    />
                  </div>

                  <div className="flex flex-col flex-1" style={{ padding: "48px 60px 0" }}>
                    <h2
                      className="uppercase font-bold line-clamp-2"
                      style={{
                        fontFamily: JOST,
                        letterSpacing: "-0.005em",
                        color: NAVY,
                        fontSize: titleFitState.size,
                        lineHeight: (titleFitState.lh + 4) / titleFitState.size,
                      }}
                    >
                      {name || "PAN DE CENTENO 100%"}
                    </h2>
                    <div style={{ height: 2, background: LINE, margin: "18px 0 24px" }} />
                    <div className="flex flex-col gap-[18px]">
                      <Bullet label="Ingredientes:" value={ingredients} />
                      <Bullet label="Tiempo de fermentación:" value={fermentTime} />
                      <Bullet label="Peso:" value={weight} />
                      <Bullet label="Precio:" value={price} price />
                    </div>

                    <div className="mt-auto" style={{ padding: "0 0 44px" }}>
                      {note && (
                        <div
                          className="italic text-[24px]"
                          style={{ fontFamily: HANKEN, borderTop: `2px dashed ${LINE}`, paddingTop: 22, color: STONE }}
                        >
                          {note}
                        </div>
                      )}
                      {showInstagramHandle && (
                        <div className="flex items-center justify-center gap-3" style={{ paddingTop: 26 }}>
                          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                            <rect x="2" y="2" width="20" height="20" rx="5.5" stroke={AMBER} strokeWidth="1.6" />
                            <circle cx="12" cy="12" r="4.6" stroke={AMBER} strokeWidth="1.6" />
                            <circle cx="17.5" cy="6.5" r="1.2" fill={AMBER} />
                          </svg>
                          <span className="text-[26px] tracking-[0.1em] font-medium" style={{ color: AMBER }}>
                            @brot.74
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {showSafeZone && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0" style={{ background: "rgba(14,35,60,.05)" }} />
                      <div
                        className="absolute rounded-[10px]"
                        style={{ left: 60, right: 60, top: 60, bottom: 60, border: "2px dashed rgba(14,35,60,.45)" }}
                      />
                      <div
                        className="absolute rounded-full font-semibold uppercase"
                        style={{
                          top: 24,
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: NAVY,
                          color: CREAM,
                          fontSize: 20,
                          letterSpacing: "0.14em",
                          padding: "6px 16px",
                        }}
                      >
                        Zona segura
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-center max-w-[380px] leading-[1.45]" style={{ color: STONE }}>
              El preview usa el mismo cálculo de encuadre que el Canvas del export.
            </p>
          </section>
        </div>
      </main>

      <style>{`
        .brot-range {
          -webkit-appearance: none;
          appearance: none;
          background: ${LINE};
          border-radius: 999px;
        }
        .brot-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: ${NAVY};
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(14, 35, 60, 0.25);
          cursor: pointer;
        }
        .brot-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: ${NAVY};
          border: 2px solid #fff;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
