"use client";

import { useState } from "react";
import type { FeatureFlagKey } from "@/lib/featureFlags";

// BRT-269: interruptores de funcionalidades del dashboard. El estado inicial
// viene del server; cada cambio se guarda al toque (PATCH) y se muestra lo
// que devolvió el endpoint, no lo que se intentó.
const FLAGS: { key: FeatureFlagKey; label: string; on: string; off: string }[] = [
  {
    key: "mpCheckout",
    label: "Pago con Mercado Pago",
    on: "Prendido: los clientes pueden pagar con Mercado Pago y el pago se confirma solo.",
    off: "Apagado: solo transferencia al alias, con confirmación manual.",
  },
];

export default function FeatureFlagsCard({ initial }: { initial: Record<FeatureFlagKey, boolean> }) {
  const [flags, setFlags] = useState(initial);
  const [saving, setSaving] = useState<FeatureFlagKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: FeatureFlagKey) {
    setSaving(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: !flags[key] }),
      });
      if (!res.ok) throw new Error();
      setFlags(await res.json());
    } catch {
      setError("No se pudo guardar el cambio. Probá de nuevo.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <h2 className="font-serif text-xl font-bold text-brown mb-3">Funcionalidades</h2>
      <div className="bg-white rounded-2xl border-2 border-border divide-y divide-border">
        {FLAGS.map(({ key, label, on, off }) => {
          const enabled = flags[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold text-charcoal">{label}</p>
                <p className="text-xs text-muted mt-0.5">{enabled ? on : off}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={label}
                disabled={saving === key}
                onClick={() => toggle(key)}
                className={`relative w-11 h-[26px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-amber" : "bg-border"}`}
              >
                <span className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-[18px]" : ""}`} />
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
