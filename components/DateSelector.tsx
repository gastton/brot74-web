"use client";

import Image from "next/image";

interface Slot {
  id: number | null;
  date: string;
  dayLabel: string;
  deliveryMode: "pickup" | "delivery" | "both";
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

const FALLBACK_IMAGE = "/products/product-1779659787800.jpeg";

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
      className="flex items-center gap-[14px] py-[14px]"
      style={{ borderBottom: last ? "none" : "1px solid rgba(14,35,60,.09)" }}
    >
      <span
        className="flex-none w-[42px] h-[42px] rounded-full flex items-center justify-center"
        style={{ background: "#F4EEE2", border: "1px solid rgba(14,35,60,.10)" }}
      >
        {icon}
      </span>
      <div>
        <div
          className="font-bold text-[10px] uppercase tracking-[.16em] whitespace-nowrap"
          style={{ color: "#C8851A" }}
        >
          {label}
        </div>
        <div className="font-semibold text-[16.5px] text-navy mt-[3px]">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function DateSelector({ slots, selectedId, onChange }: DateSelectorProps) {
  const visibleSlots = slots.filter((s) => !s.disabled);

  if (visibleSlots.length === 0) {
    return (
      <div
        className="rounded-[22px] px-6 py-10 text-center"
        style={{ background: "#FBF7EF", border: "1px solid rgba(14,35,60,.10)" }}
      >
        <p className="text-stone text-sm">No hay fechas disponibles por el momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-[430px] mx-auto">
      {visibleSlots.map((slot, i) => {
        const date = new Date(slot.date);
        const weekday = date.toLocaleDateString("es-AR", { weekday: "long" }).toUpperCase();
        const month = date.toLocaleDateString("es-AR", { month: "short" }).toUpperCase().replace(".", "");
        const day = date.getDate();
        const isOpen = slot.id !== null;

        const cutoffLabel = slot.orderCutoff
          ? new Date(slot.orderCutoff).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
          : formatCutoff(slot.date);

        return (
          <article
            key={slot.id ?? `slot-${i}`}
            className="rounded-[22px] overflow-hidden"
            style={{
              background: "#FBF7EF",
              border: "1px solid rgba(14,35,60,.10)",
              boxShadow: "0 26px 48px -28px rgba(14,35,60,.4)",
            }}
          >
            {/* ── Media: foto + fecha + badge ── */}
            <div className="relative h-[290px]">
              <Image
                src={slot.imageUrl || FALLBACK_IMAGE}
                alt="Pan artesanal"
                fill
                className="object-cover"
                style={{
                  objectPosition: `${slot.imageFocalX}% ${slot.imageFocalY}%`,
                  transform: `scale(${slot.imageScale})`,
                  transformOrigin: `${slot.imageFocalX}% ${slot.imageFocalY}%`,
                }}
                sizes="430px"
                priority={i === 0}
              />

              {/* Scrim */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg,rgba(14,35,60,.36) 0%,rgba(14,35,60,.04) 34%,rgba(14,35,60,.5) 100%)" }}
              />

              {/* Badge estado */}
              <span
                className="absolute top-4 right-4 flex items-center gap-[7px] text-navy font-bold text-[12px] tracking-[.02em] px-[14px] py-[7px] rounded-full whitespace-nowrap"
                style={{
                  background: "rgba(248,243,234,.62)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  boxShadow: "0 4px 14px -6px rgba(0,0,0,.4)",
                }}
              >
                {isOpen && (
                  <span className="w-2 h-2 rounded-full brot-pulse" style={{ background: "#16C65A" }} />
                )}
                {isOpen ? "Pedidos abiertos" : "Pedidos cerrados"}
              </span>

              {/* Fecha centrada */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center text-center select-none"
                style={{ color: "#F4EEE2", textShadow: "0 2px 18px rgba(14,35,60,.5)" }}
              >
                <div className="font-bold text-[17px] tracking-[.3em] uppercase">{weekday}</div>
                <div className="font-semibold text-[12px] tracking-[.3em] uppercase mt-0.5" style={{ opacity: 0.85 }}>
                  {month}
                </div>
                <div
                  className="leading-[.96] tracking-[-0.02em] mt-0.5"
                  style={{
                    fontFamily: "var(--font-newsreader, 'Newsreader', Georgia, serif)",
                    fontWeight: 500,
                    fontSize: "88px",
                  }}
                >
                  {day}
                </div>
              </div>
            </div>

            {/* ── Cuerpo ── */}
            <div className="px-6 pb-6 pt-2">
              {slot.pickupTime && (
                <InfoRow icon={<ClockIcon />} label="Horario de retiro" value={slot.pickupTime} />
              )}
              {slot.location && (
                <InfoRow icon={<PinIcon />} label="Lugar de retiro" value={slot.location} />
              )}
              <InfoRow icon={<CalIcon />} label="Pedidos hasta" value={cutoffLabel} last />

              {/* CTA */}
              <button
                disabled={!isOpen}
                onClick={() => { if (isOpen && slot.id !== null) onChange(slot.id); }}
                className="group mt-[18px] w-full flex items-center justify-center gap-[10px] font-bold text-[15px] tracking-[.03em] py-[17px] rounded-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "#0E233C",
                  color: "#F4EEE2",
                  transition: "transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s",
                }}
                onMouseEnter={(e) => { if (isOpen) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 30px -16px rgba(14,35,60,.55)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                VER MENÚ{" "}
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
          </article>
        );
      })}
    </div>
  );
}
