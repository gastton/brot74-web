"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Phone, MapPin, Package, Truck, Home, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Order {
  id: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  status: string;
  total: number;
  notes: string;
  deliveryMode: string;
  slotLabel: string;
  slotDate: string;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number }[];
}

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

  const fetchOrders = useCallback(async () => {
    const url = slotFilter ? `/api/admin/orders?slotId=${slotFilter}` : "/api/admin/orders";
    const res = await fetch(url);
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  }, [slotFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function updateStatus(orderId: number, status: string) {
    setUpdating(orderId);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchOrders();
    setUpdating(null);
  }

  const grouped = orders.reduce<Record<string, Order[]>>((acc, o) => {
    const key = `${o.slotDate}|${o.slotLabel}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-brown">Pedidos</h1>
        <p className="text-muted text-sm mt-1">
          {slotFilter ? "Filtrando por fecha" : "Todos los pedidos"} · {orders.length} total
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
        Object.entries(grouped).map(([key, slotOrders]) => {
          const [, label] = key.split("|");
          const slotDeliveryMode = slotOrders[0]?.deliveryMode;
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                {slotDeliveryMode === "delivery" ? <Truck className="w-4 h-4 text-amber" /> : slotDeliveryMode === "both" ? <div className="flex gap-0.5"><Home className="w-3.5 h-3.5 text-amber" /><Truck className="w-3.5 h-3.5 text-amber" /></div> : <Home className="w-4 h-4 text-amber" />}
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
        })
      )}
    </div>
  );
}

export default function PedidosPage() {
  return <Suspense><PedidosContent /></Suspense>;
}
