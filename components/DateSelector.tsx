"use client";

import Image from "next/image";
import { useState } from "react";
import { ClockIcon, PinIcon, CalendarIcon, TruckIcon } from "./FlowIcons";
import HowItWorksSheet from "./HowItWorksSheet";
import { deliveryModeLabels } from "@/lib/deliveryMode";

interface Slot {
  id: number | null;
  date: string;
  dayLabel: string;
  pickupTime: string;
  location: string;
  deliveryMode: string;
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

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}
function InfoRow({ icon, label, value, last }: InfoRowProps) {
  return (
    <div
      className="flex items-center gap-2 py-2"
      style={{ borderBottom: last ? "none" : "1px solid rgba(14,35,60,.10)" }}
    >
      <span className="flex-none flex">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="brot-mlabel whitespace-nowrap" style={{ fontWeight: 600 }}>
          {label}
        </div>
        <div className="text-[16px] text-navy mt-0 leading-[1.25] whitespace-nowrap">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function DateSelector({ slots, onChange }: DateSelectorProps) {
  const [showHow, setShowHow] = useState(false);
  const visibleSlots = slots.filter((s) => !s.disabled);

  // Sin fechas abiertas, page.tsx muestra <NoSlotsScreen /> (v57).
  if (visibleSlots.length === 0) return null;

  return (
    <div className="space-y-10 w-full max-w-[430px] min-[900px]:max-w-[780px] mx-auto">
      {visibleSlots.map((slot, i) => {
        const date = new Date(slot.date);
        const weekday = date.toLocaleDateString("es-AR", { weekday: "long" }).toUpperCase();
        const month = date.toLocaleDateString("es-AR", { month: "long" }).toUpperCase();
        const day = date.getDate();
        const isOpen = slot.id !== null;
        // Fechas de delivery: "Horario/Zona de delivery" y camión; retiro (y las viejas "both") como siempre.
        const labels = deliveryModeLabels(slot.deliveryMode);
        const isDelivery = slot.deliveryMode === "delivery";

        const cutoffLabel = slot.orderCutoff
          ? new Date(slot.orderCutoff).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
          : formatCutoff(slot.date);

        return (
          <article key={slot.id ?? `slot-${i}`} className="brot-card-article">
            {/* ── Foto a sangre SIN velo + pieza blanca con la fecha ── */}
            <div className="brot-card-media relative h-[300px] -mx-6 min-[900px]:mx-0">
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

              {/* v55 · hoja de calendario en 3 líneas: día (500 14px) / número ámbar (64px 400, como el
                 "74" del hero) / mes (300 12px, como la frase del hero). */}
              <div
                className="absolute left-6 min-[900px]:left-0 select-none"
                style={{
                  bottom: "-28px",
                  minWidth: "150px",
                  background: "#F4EEE2",
                  padding: "14px 16px 12px",
                  fontFamily: "var(--font-jost), system-ui, sans-serif",
                  color: "#0E233C",
                  textTransform: "uppercase",
                }}
              >
                <div className="brot-rule" />
                <div style={{ marginTop: "12px", fontSize: "14px", fontWeight: 500, lineHeight: 1.55, letterSpacing: "1.76px" }}>
                  {weekday}
                </div>
                <div style={{ marginTop: "4px", fontSize: "64px", fontWeight: 400, lineHeight: 0.94, letterSpacing: "-.02em", color: "#C8851A" }}>
                  {day}
                </div>
                <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: 300, lineHeight: 1.55, letterSpacing: "1.76px" }}>
                  {month}
                </div>
              </div>
            </div>

            {/* ── Datos ── */}
            <div className="brot-card-body pt-[46px]">
              {slot.pickupTime && (
                <InfoRow icon={<ClockIcon />} label={labels.time} value={slot.pickupTime} />
              )}
              {slot.location && (
                <InfoRow icon={isDelivery ? <TruckIcon /> : <PinIcon />} label={labels.place} value={slot.location} />
              )}
              <InfoRow icon={<CalendarIcon />} label="Pedidos hasta" value={cutoffLabel} last />

              {/* CTA fija abajo, con el link "¿Cómo funciona?" debajo */}
              <div className="sticky bottom-0 bg-white pt-[18px] pb-[14px] flex flex-col gap-[2px]">
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
                <button type="button" onClick={() => setShowHow(true)} className="brot-link">
                  ¿Cómo funciona?
                </button>
              </div>
            </div>
          </article>
        );
      })}
      {showHow && <HowItWorksSheet onClose={() => setShowHow(false)} />}
    </div>
  );
}
