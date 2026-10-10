"use client";

import Image from "next/image";
import { useState } from "react";

interface Slot {
  id: number | null;
  date: string;
  dayLabel: string;
  pickupTime: string;
  location: string;
  imageUrl: string;
  imageFocalX: number;
  imageFocalY: number;
  imageScale: number;
  orderCutoff: string | null;
  disabled: boolean;
}

interface DateSelectorProps {
  slots: Slot[];
  selectedId: number | null;
  onChange: (id: number) => void;
}

const FALLBACK_IMAGE = "/products/fecha-default-basket.jpeg";

function formatCutoff(dateStr: string): string {
  const d = new Date(dateStr);
  const cutoff = new Date(d.getTime() - 20 * 60 * 60 * 1000);
  return cutoff.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

// SVG icons inline (stroke navy, 1.7px)
function ClockIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8 3.5v3M16 3.5v3"/>
    </svg>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}
function InfoRow({ icon, label, value, last }: InfoRowProps) {
  return (
    <div
      className="flex items-center gap-3 py-2"
      style={{ borderBottom: last ? "none" : "1px solid rgba(14,35,60,.10)" }}
    >
      <span className="brot-ring">{icon}</span>
      <div>
        <div className="brot-mlabel brot-mlabel-amber whitespace-nowrap" style={{ fontWeight: 500 }}>
          {label}
        </div>
        <div className="text-[16px] text-navy mt-0 leading-[1.25]">
          {value}
        </div>
      </div>
    </div>
  );
}

function NoSlotsEmptyState() {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: value.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      className="text-center"
      style={{ background: "#fff", borderTop: "1px solid #0E233C", padding: "38px 6px 32px" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ramillete-mono-navy.png" alt="" style={{ width: "74px", height: "auto", display: "block", margin: "0 auto", opacity: 0.92 }} />

      {/* Chip de estado */}
      <div className="inline-flex items-center gap-[7px] mt-5 font-bold text-[11px] tracking-[.14em] uppercase" style={{ color: "#B86A3D" }}>
        <span className="w-2 h-2 rounded-full flex-none" style={{ background: "#B86A3D" }} />
        Pedidos cerrados
      </div>

      <h3 className="font-bold text-[22px] leading-[1.18] tracking-[-0.01em] text-navy mx-auto mt-[10px] mb-0" style={{ maxWidth: "18ch", textWrap: "balance" as React.CSSProperties["textWrap"] }}>
        Tu próximo BROT está en el horno
      </h3>
      <p className="font-medium text-[15px] leading-[1.5] text-stone mx-auto mt-[11px] mb-0" style={{ maxWidth: "30ch", textWrap: "pretty" as React.CSSProperties["textWrap"] }}>
        Horneamos por tandas, en cantidades limitadas. Dejanos tu contacto y te avisamos apenas se abra la próxima fecha.
      </p>

      {/* Formulario / confirmación */}
      {sent ? (
        <div className="flex flex-col items-center gap-2 mt-6 rounded-[4px] py-5 px-4" style={{ background: "#F4EEE2" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#C8851A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>
          </svg>
          <div className="font-bold text-[16px] text-navy">Listo, te avisamos</div>
          <div className="font-medium text-[15px] leading-[1.45] text-stone text-center" style={{ maxWidth: "28ch" }}>
            Apenas abramos la próxima tanda, sos de los primeros en enterarte.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-[10px] text-left">
          <input
            type="text"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Tu WhatsApp"
            aria-label="Tu WhatsApp"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            className="brot-input"
            style={{ fontWeight: 500 }}
          />
          {error && (
            <p className="text-[15px] text-center m-0" style={{ color: "#A6442E" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="brot-pill"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Enviando…" : "Avisame cuando abra"}
          </button>
          <p className="font-medium text-[14px] leading-[1.4] text-center m-0" style={{ color: "#6E7482" }}>
            Te escribimos una sola vez, para la próxima fecha. Sin spam.
          </p>
        </form>
      )}

      {/* Instagram */}
      <div className="mt-[22px] pt-5" style={{ borderTop: "1px solid rgba(14,35,60,.09)" }}>
        <a
          href="https://www.instagram.com/brot.74"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 no-underline font-semibold text-[15px] tracking-[.01em] text-stone"
          style={{ transition: "color .16s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#8A5A0E"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = ""; }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
          Seguinos en Instagram · @brot.74
        </a>
      </div>
    </article>
  );
}

export default function DateSelector({ slots, onChange }: DateSelectorProps) {
  const visibleSlots = slots.filter((s) => !s.disabled);

  if (visibleSlots.length === 0) {
    return <NoSlotsEmptyState />;
  }

  return (
    <div className="space-y-10 w-full max-w-[430px] min-[900px]:max-w-[780px] mx-auto">
      {visibleSlots.map((slot, i) => {
        const date = new Date(slot.date);
        const weekday = date.toLocaleDateString("es-AR", { weekday: "long" }).toUpperCase();
        const month = date.toLocaleDateString("es-AR", { month: "long" }).toUpperCase();
        const day = date.getDate();
        const isOpen = slot.id !== null;

        const cutoffLabel = slot.orderCutoff
          ? new Date(slot.orderCutoff).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
          : formatCutoff(slot.date);

        return (
          <article key={slot.id ?? `slot-${i}`} className="brot-card-article">
            {/* ── Foto a sangre SIN velo + pieza blanca con la fecha ── */}
            <div className="brot-card-media relative h-[330px] -mx-6 min-[900px]:mx-0">
              <div className="absolute inset-0 overflow-hidden">
                <Image
                  src={slot.imageUrl || FALLBACK_IMAGE}
                  alt="Pan artesanal"
                  fill
                  style={slot.imageScale < 1
                    ? { objectFit: "contain" }
                    : { objectFit: "cover", objectPosition: `${slot.imageFocalX}% ${slot.imageFocalY}%`, transform: `scale(${slot.imageScale})`, transformOrigin: `${slot.imageFocalX}% ${slot.imageFocalY}%` }}
                  sizes="(min-width: 900px) 780px, 430px"
                  priority={i === 0}
                />
              </div>

              <div
                className="absolute left-6 min-[900px]:left-0 select-none"
                style={{ bottom: "-34px", width: "190px", background: "#fff", padding: "16px 18px 14px" }}
              >
                <div className="brot-rule" />
                <div className="mt-3" style={{ fontSize: "84px", fontWeight: 300, lineHeight: 0.9, letterSpacing: "-.03em", color: "#0E233C" }}>
                  {day}
                </div>
                <div className="brot-kick mt-2" style={{ color: "#0E233C" }}>
                  {weekday} · {month}
                </div>
              </div>
            </div>

            {/* ── Datos ── */}
            <div className="brot-card-body pt-[52px]">
              {slot.pickupTime && (
                <InfoRow icon={<ClockIcon />} label="Horario de retiro" value={slot.pickupTime} />
              )}
              {slot.location && (
                <InfoRow icon={<PinIcon />} label="Lugar de retiro" value={slot.location} />
              )}
              <InfoRow icon={<CalIcon />} label="Pedidos hasta" value={cutoffLabel} last />

              {/* CTA fija abajo */}
              <div className="sticky bottom-0 bg-white pt-[18px] pb-[30px]">
                <button
                  disabled={!isOpen}
                  onClick={() => { if (isOpen && slot.id !== null) onChange(slot.id); }}
                  className="brot-pill group"
                >
                  Panes del día
                  <span
                    className="inline-block"
                    style={{ transition: "transform .2s cubic-bezier(.2,.7,.3,1)" }}
                    ref={(el) => {
                      if (!el) return;
                      const btn = el.closest("button")!;
                      btn.addEventListener("mouseenter", () => { el.style.transform = "translateX(5px)"; });
                      btn.addEventListener("mouseleave", () => { el.style.transform = ""; });
                    }}
                  >
                    →
                  </span>
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
