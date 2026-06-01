"use client";

import { Truck, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slot {
  id: number | null;
  date: string;
  dayLabel: string;
  deliveryMode: "pickup" | "delivery" | "both";
  disabled: boolean;
}

interface DateSelectorProps {
  slots: Slot[];
  selectedId: number | null;
  onChange: (id: number) => void;
}

export default function DateSelector({ slots, selectedId, onChange }: DateSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {slots.map((slot, i) => {
        const date = new Date(slot.date);
        const isSelected = slot.id !== null && selectedId === slot.id;
        const disabled = slot.disabled;
        const canPickup  = slot.deliveryMode === "pickup"  || slot.deliveryMode === "both";
        const canDeliver = slot.deliveryMode === "delivery" || slot.deliveryMode === "both";

        return (
          <button
            key={slot.id ?? `disabled-${i}`}
            disabled={disabled}
            onClick={() => { if (slot.id !== null) onChange(slot.id); }}
            className={cn(
              "p-3 rounded-2xl border-2 text-left transition-all duration-200",
              disabled
                ? "border-border bg-white opacity-50 cursor-not-allowed"
                : isSelected
                ? "border-amber bg-amber/10 shadow-sm"
                : "border-border bg-white hover:border-amber/50"
            )}
          >
            {/* Íconos siempre visibles, habilitados/deshabilitados según modo */}
            <div className="flex gap-1.5 mb-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center",
                disabled
                  ? "bg-cream text-muted/30"
                  : canPickup
                  ? isSelected ? "bg-amber text-white" : "bg-cream text-muted"
                  : "bg-cream text-muted/25"
              )}>
                <Home className="w-3.5 h-3.5" />
              </div>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center",
                disabled
                  ? "bg-cream text-muted/30"
                  : canDeliver
                  ? isSelected ? "bg-amber text-white" : "bg-cream text-muted"
                  : "bg-cream text-muted/25"
              )}>
                <Truck className="w-3.5 h-3.5" />
              </div>
            </div>

            <p className={cn(
              "font-bold text-sm leading-tight",
              disabled ? "text-muted" : isSelected ? "text-brown" : "text-charcoal"
            )}>
              {date.toLocaleDateString("es-AR", { weekday: "long" }).replace(/^\w/, (c) => c.toUpperCase())}
            </p>

            <p className={cn("text-xs mt-0.5", disabled ? "text-muted/60" : isSelected ? "text-brown/70" : "text-muted")}>
              {date.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
            </p>

            <p className={cn("text-xs mt-1 font-medium", disabled ? "text-muted/40" : isSelected ? "text-amber" : "text-muted/70")}>
              {slot.deliveryMode === "both" ? "Retiro o delivery" : slot.deliveryMode === "delivery" ? "Delivery" : "Retiro"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
