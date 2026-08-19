"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Bell, MessageCircle, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

interface WaitlistEntry {
  id: number;
  phone: string;
  notified: boolean;
  createdAt: string;
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  // BRT-97: fuente de verdad de "¿hay una próxima fecha creada?" — mismo
  // endpoint público que usa el form de "Pedidos cerrados". Mientras sea
  // null, el botón de WhatsApp de cada fila queda deshabilitado.
  const [hasNextDate, setHasNextDate] = useState(false);

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/admin/waitlist");
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
    fetch("/api/delivery-slots/next")
      .then((r) => r.json())
      .then((data) => setHasNextDate(!!data))
      .catch(() => {});
  }, [fetchEntries]);

  async function toggleNotified(entry: WaitlistEntry) {
    setUpdating(entry.id);
    await fetch(`/api/admin/waitlist/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notified: !entry.notified }),
    });
    await fetchEntries();
    setUpdating(null);
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Sacar este número de la waitlist?")) return;
    await fetch(`/api/admin/waitlist/${id}`, { method: "DELETE" });
    fetchEntries();
  }

  async function handleClearNotified() {
    if (!confirm("¿Borrar todos los números ya avisados? No se puede deshacer.")) return;
    setClearing(true);
    await fetch("/api/admin/waitlist", { method: "DELETE" });
    await fetchEntries();
    setClearing(false);
  }

  const pending = entries.filter((e) => !e.notified).length;
  const notifiedCount = entries.length - pending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brown">Waitlist</h1>
          <p className="text-muted text-sm mt-1">
            {pending} sin avisar · {entries.length} total
          </p>
        </div>
        <button
          onClick={handleClearNotified}
          disabled={notifiedCount === 0 || clearing || !hasNextDate}
          className="flex items-center gap-2 rounded-xl text-sm px-4 py-2 border-2 border-border text-muted hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted disabled:hover:border-border"
        >
          {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Borrar avisados
        </button>
      </div>

      {!hasNextDate && entries.length > 0 && (
        <div className="bg-amber/10 border-2 border-amber/30 rounded-2xl p-4 text-sm text-brown">
          Todavía no creaste la próxima fecha en <strong>Fechas</strong> — el botón de WhatsApp,
          el toggle de Avisado y <strong>Borrar avisados</strong> quedan deshabilitados hasta que haya una.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted" /></div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-border p-12 text-center">
          <Bell className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">Todavía no hay nadie anotado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white rounded-2xl border-2 p-4 flex items-center gap-4 ${entry.notified ? "border-border opacity-60" : "border-border"}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-charcoal">{entry.phone}</p>
                <p className="text-xs text-muted mt-0.5">
                  {new Date(entry.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <a
                href={hasNextDate ? `https://wa.me/549${entry.phone}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!hasNextDate}
                title={hasNextDate ? "Abrir WhatsApp" : "Creá la próxima fecha primero"}
                onClick={(e) => { if (!hasNextDate) e.preventDefault(); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  hasNextDate
                    ? "border-green-200 text-green-600 hover:bg-green-50 cursor-pointer"
                    : "border-border text-muted/50 cursor-not-allowed"
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>

              <button
                onClick={() => toggleNotified(entry)}
                disabled={updating === entry.id || !hasNextDate}
                title={hasNextDate ? undefined : "Creá la próxima fecha primero"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted hover:text-brown transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted"
              >
                {updating === entry.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : entry.notified ? (
                  <ToggleRight className="w-5 h-5 text-green-500" />
                ) : (
                  <ToggleLeft className="w-5 h-5" />
                )}
                <span className="hidden sm:inline">Avisado</span>
              </button>

              <button onClick={() => handleDelete(entry.id)} className="p-2 text-muted hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
