"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Phone, MapPin, Package, Home, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import { isPickupPast } from "@/lib/deliverySlots";

interface Order {
  id: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  status: string;
  total: number;
  notes: string;
  slotLabel: string;
  slotDate: string;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number }[];
}

// Estados con el pago ya confirmado (para el resumen de panes por fecha).
const PAID_STATUSES = ["paid", "preparing", "ready", "delivered"];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pendiente",  color: "bg-yellow-100 text-yellow-800" },
  paid:      { label: "Pagado",     color: "bg-blue-100 text-blue-800" },
  preparing: { label: "Preparando", color: "bg-purple-100 text-purple-800" },
  ready:     { label: "Listo",      color: "bg-green-100 text-green-800" },
  delivered: { label: "Entregado",  color: "bg-gray-100 text-gray-700" },
  cancelled: { label: "Cancelado",  color: "bg-red-100 text-red-700" },
};

function PedidosContent() {
  const searchParams = useSearchParams();
  const slotFilter = searchParams.get("slotId");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const fetchOrders = useCallback(async () => {
    const url = slotFilter ? `/api/admin/orders?slotId=${slotFilter}` : "/api/admin/orders";
    try {
      const res = await fetch(url);
      // Si falla (ej. sesión vencida en medio del refresco automático) se
      // conserva la lista anterior en vez de pisarla con el error.
      if (res.ok) setOrders(await res.json());
    } catch {
      // Sin conexión: se reintenta en el próximo refresco.
    }
    setLoading(false);
  }, [slotFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Refresco automático: los pedidos nuevos (y el total ganado) aparecen sin
  // recargar. Cada 30 s con la pestaña visible, y al volver a ella.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchOrders();
    }, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchOrders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchOrders]);

  async function updateStatus(orderId: number, status: string) {
    setUpdating(orderId);
    // Si el servidor rechaza el cambio (ej. 409 sin stock para reactivar, 401
    // sesión vencida) hay que avisarlo: antes el desplegable volvía al valor
    // anterior sin ningún mensaje.
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toastError(data.error ?? "No se pudo cambiar el estado del pedido.");
      }
    } catch {
      toastError("Error de conexión. Probá de nuevo.");
    }
    await fetchOrders();
    setUpdating(null);
  }

  // Solo pedidos cancelados (el servidor rechaza el resto con 409).
  async function deleteOrder(orderId: number) {
    if (!confirm("¿Borrar este pedido cancelado? No se puede deshacer.")) return;
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toastError(data.error ?? "No se pudo borrar el pedido.");
      }
    } catch {
      toastError("Error de conexión. Probá de nuevo.");
    }
    await fetchOrders();
    setUpdating(null);
  }

  const grouped = orders.reduce<Record<string, Order[]>>((acc, o) => {
    const key = `${o.slotDate}|${o.slotLabel}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  function renderGroup([key, slotOrders]: [string, Order[]]) {
    const [, label] = key.split("|");
    return (
      <div key={key}>
        <div className="flex items-center gap-2 mb-3">
          <Home className="w-4 h-4 text-amber" />
          <h2 className="font-serif text-lg font-bold text-brown">{label}</h2>
          <span className="text-xs text-muted ml-auto">{slotOrders.length} pedidos</span>
        </div>

        <div className="space-y-3">
          {slotOrders.map((order) => {
            const st = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
            return (
              <div key={order.id} className="bg-white rounded-2xl border-2 border-border p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-charcoal">{order.customerName}</p>
                      <span className="text-xs text-muted">#{order.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted">
                      <Phone className="w-3.5 h-3.5" />
                      <a href={`tel:${order.customerPhone}`} className="hover:text-brown">{order.customerPhone}</a>
                    </div>
                    {order.customerAddress && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{order.customerAddress}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                    <div className="relative">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        disabled={updating === order.id}
                        className="appearance-none bg-cream border-2 border-border rounded-lg pl-3 pr-7 py-1.5 text-sm font-medium text-charcoal focus:outline-none focus:border-amber cursor-pointer"
                      >
                        {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      {updating === order.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      )}
                    </div>
                    {order.status === "cancelled" && (
                      <button
                        onClick={() => deleteOrder(order.id)}
                        disabled={updating === order.id}
                        aria-label="Borrar pedido cancelado"
                        className="p-2 text-muted hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-charcoal">{item.name} <span className="text-muted">×{item.quantity}</span></span>
                        <span className="text-muted">{formatCurrency(item.quantity * item.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-brown">{formatCurrency(order.total)}</span>
                  </div>
                  {order.notes && (
                    <p className="text-xs text-muted mt-2 italic">📝 {order.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Archivo: las fechas cuyo día de retiro ya pasó. Entre el cierre de "Pedidos
  // hasta" y la entrega los pedidos siguen a la vista (hay que cobrar, hornear y entregar).
  const nowDate = new Date();
  const groups = Object.entries(grouped);
  const archivedGroups = groups.filter(([key]) => isPickupPast({ date: key.split("|")[0], orderCutoff: null }, nowDate));
  const activeGroups = groups.filter(([key]) => !isPickupPast({ date: key.split("|")[0], orderCutoff: null }, nowDate));

  // Resumen de panes de la fecha: suma de unidades por pan, sin pedidos cancelados.
  const breadSummary = (() => {
    const byName = new Map<string, { total: number; paid: number }>();
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      for (const i of o.items) {
        const row = byName.get(i.name) ?? { total: 0, paid: 0 };
        row.total += i.quantity;
        if (PAID_STATUSES.includes(o.status)) row.paid += i.quantity;
        byName.set(i.name, row);
      }
    }
    const rows = [...byName.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => a.name.localeCompare(b.name, "es"));
    return { rows, total: rows.reduce((n, r) => n + r.total, 0), paid: rows.reduce((n, r) => n + r.paid, 0) };
  })();

  // Total ganado de la fecha: suma de order.total (el monto que cobró el
  // servidor, con descuentos) de todos los pedidos menos los cancelados. Si un
  // pedido se cancela, al refrescar la lista sale solo de la suma.
  const earnings = orders.reduce(
    (acc, o) => {
      if (o.status === "cancelled") return acc;
      acc.total += o.total;
      if (PAID_STATUSES.includes(o.status)) acc.paid += o.total;
      return acc;
    },
    { total: 0, paid: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-brown">Pedidos</h1>
        <p className="text-muted text-sm mt-1">
          {slotFilter ? "Filtrando por fecha" : "Todos los pedidos"} · {orders.length} total
          {slotFilter && (
            <> · <Link href="/admin/pedidos" className="text-amber hover:underline">Ver todos</Link></>
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted" /></div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-border p-12 text-center">
          <Package className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">No hay pedidos todavía.</p>
        </div>
      ) : (
        <>
          {/* Con una fecha elegida (viene del Dashboard) se muestra el total de panes;
              el detalle de pedidos queda detrás de un botón. */}
          {slotFilter && (
            <div className="bg-white rounded-2xl border-2 border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-amber" />
                <h2 className="font-serif text-lg font-bold text-brown">Total de panes</h2>
                <span className="text-xs text-muted ml-auto">{orders[0]?.slotLabel}</span>
              </div>
              {breadSummary.rows.length === 0 ? (
                <p className="text-sm text-muted">No hay pedidos activos en esta fecha.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted text-left border-b border-border">
                      <th className="py-2 font-semibold">Pan</th>
                      <th className="py-2 font-semibold text-right">Total</th>
                      <th className="py-2 font-semibold text-right">Pagados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breadSummary.rows.map((r) => (
                      <tr key={r.name} className="border-b border-border last:border-0">
                        <td className="py-2 text-charcoal">{r.name}</td>
                        <td className="py-2 text-right font-bold text-brown">{r.total}</td>
                        <td className="py-2 text-right text-muted">{r.paid}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-bold">
                      <td className="py-2">Total panes</td>
                      <td className="py-2 text-right text-brown">{breadSummary.total}</td>
                      <td className="py-2 text-right text-muted">{breadSummary.paid}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
              <div className="mt-4 pt-3 border-t-2 border-border">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-lg font-bold text-brown">Total ganado</span>
                  <span className="font-serif text-2xl font-bold text-brown">{formatCurrency(earnings.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted mt-1">
                  <span>Pagado {formatCurrency(earnings.paid)}</span>
                  <span>Pendiente de pago {formatCurrency(earnings.total - earnings.paid)}</span>
                </div>
              </div>
              <p className="text-xs text-muted mt-3">Sin contar pedidos cancelados. “Pagados” incluye pagado, preparando, listo y entregado. Se actualiza solo cada 30 segundos.</p>
              <button
                onClick={() => setShowDetail((v) => !v)}
                className="mt-3 flex items-center gap-2 text-sm text-amber hover:underline"
              >
                {showDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showDetail ? "Ocultar detalle de pedidos" : `Ver detalle de pedidos (${orders.length})`}
              </button>
            </div>
          )}

          {(!slotFilter || showDetail) && (
            <>
              {(slotFilter ? groups : activeGroups).map(renderGroup)}

              {!slotFilter && archivedGroups.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowArchived((v) => !v)}
                    className="flex items-center gap-2 text-sm text-muted hover:text-brown transition-colors py-1"
                  >
                    {showArchived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showArchived
                      ? "Ocultar fechas archivadas"
                      : `Ver ${archivedGroups.length} fecha${archivedGroups.length !== 1 ? "s" : ""} archivada${archivedGroups.length !== 1 ? "s" : ""} (${archivedGroups.reduce((n, [, o]) => n + o.length, 0)} pedidos)`}
                  </button>
                  {showArchived && <div className="mt-3 space-y-6">{archivedGroups.map(renderGroup)}</div>}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function PedidosPage() {
  return <Suspense><PedidosContent /></Suspense>;
}
