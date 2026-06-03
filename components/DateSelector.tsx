"use client";

import Image from "next/image";
import { Truck, Home, Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

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
  orderCutoff: string | null;
  disabled: boolean;
}

interface DateSelectorProps {
  slots: Slot[];
  selectedId: number | null;
  onChange: (id: number) => void;
}

const HERO_IMAGE = "/products/product-1779659787800.jpeg";
const CUTOFF_HOURS = 20;

function getCutoffDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(d.getTime() - CUTOFF_HOURS * 60 * 60 * 1000);
}

function formatCutoff(dateStr: string): string {
  const cutoff = getCutoffDate(dateStr);
  return cutoff.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

export default function DateSelector({ slots, selectedId, onChange }: DateSelectorProps) {
  const availableSlots = slots.filter((s) => !s.disabled && s.id !== null);
  const firstAvailable = availableSlots[0];

  const visibleSlots = slots.filter((s) => !s.disabled);

  if (visibleSlots.length === 0) {
    return (
      <div className="bg-cream border-2 border-border rounded-2xl px-5 py-8 text-center">
        <p className="text-muted text-sm">No hay fechas disponibles por el momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-sm mx-auto">
      {visibleSlots.map((slot, i) => {
        const date = new Date(slot.date);
        const isSelected = slot.id !== null && selectedId === slot.id;
        const disabled = slot.disabled;
        const isFirst = !disabled && slot.id === firstAvailable?.id;

        const weekday = date
          .toLocaleDateString("es-AR", { weekday: "long" })
          .toUpperCase();
        const month = date
          .toLocaleDateString("es-AR", { month: "short" })
          .toUpperCase()
          .replace(".", "");
        const day = date.getDate();

        const modeLabel =
          slot.deliveryMode === "both"
            ? "Retiro o delivery"
            : slot.deliveryMode === "delivery"
            ? "Delivery"
            : "Retiro";

        const ModeIcon =
          slot.deliveryMode === "delivery" ? Truck : slot.deliveryMode === "both" ? Truck : Home;

        return (
          <div
            key={slot.id ?? `disabled-${i}`}
            className={cn(
              "rounded-3xl overflow-hidden shadow-sm border-2 transition-all duration-200",
              disabled
                ? "border-border opacity-60"
                : isSelected
                ? "border-amber shadow-md"
                : "border-border hover:border-amber/50 hover:shadow-md"
            )}
          >
            {/* Hero image with date overlay */}
            <div className="relative h-72 sm:h-80">
              <Image
                src={slot.imageUrl || HERO_IMAGE}
                alt="Pan artesanal"
                fill
                className="object-cover"
                style={{ objectPosition: `${slot.imageFocalX}% ${slot.imageFocalY}%` }}
                sizes="(max-width: 672px) 100vw, 672px"
                priority={i === 0}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />

              {/* Status badge */}
              <div className="absolute top-3 right-3">
                {disabled ? (
                  <span className="bg-white/20 backdrop-blur-sm text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full border border-white/30">
                    Cerrado
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200">
                    Pedidos abiertos
                  </span>
                )}
              </div>

              {/* Date centered on image */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <p className="text-xl font-bold tracking-widest uppercase opacity-90">
                  {weekday}
                </p>
                <p className="text-base tracking-widest uppercase opacity-70 mt-0.5">
                  {month}
                </p>
                <p className="text-7xl font-bold leading-none mt-1">{day}</p>
              </div>
            </div>

            {/* Info section */}
            <div className="bg-white px-5 py-3 space-y-2">
              {slot.pickupTime && (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-brown" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Horario de retiro</p>
                    <p className="text-sm font-semibold text-charcoal leading-tight">{slot.pickupTime}</p>
                  </div>
                </div>
              )}

              {slot.location && (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-brown" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Lugar de retiro</p>
                    <p className="text-sm font-semibold text-charcoal leading-tight">{slot.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-brown" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Pedidos hasta</p>
                  <p className="text-sm font-semibold text-charcoal leading-tight">
                    {slot.orderCutoff
                      ? new Date(slot.orderCutoff).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).replace(/^\w/, c => c.toUpperCase())
                      : formatCutoff(slot.date)}
                  </p>
                </div>
              </div>

              <button
                disabled={disabled}
                onClick={() => {
                  if (slot.id !== null) onChange(slot.id);
                }}
                className={cn(
                  "w-full rounded-2xl py-3.5 px-4 font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 mt-1",
                  disabled
                    ? "bg-cream text-muted cursor-not-allowed"
                    : isSelected
                    ? "bg-amber text-white shadow-sm"
                    : "bg-brown text-cream hover:bg-charcoal"
                )}
              >
                {isSelected ? "✓ Fecha seleccionada" : "VER MENÚ →"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
