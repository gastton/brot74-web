import { prisma } from "@/lib/db";
import Link from "next/link";
import { ShoppingBag, Package, Calendar, TrendingUp, ChevronDown } from "lucide-react";
import { isPickupPast } from "@/lib/deliverySlots";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  // Mismo criterio de "retiro pasado" que Pedidos (ver lib/deliverySlots.ts): se
  // trae un margen de un día hacia atrás y se clasifica con isPickupPast.
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const slotInclude = {
    orders: { where: { status: { notIn: ["cancelled"] } } },
    stocks: { include: { product: { select: { name: true } } } },
  };

  const [totalOrders, pendingOrders, paidOrders, recentAndFutureSlots, olderSlots] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.order.count({ where: { status: "paid" } }),
    prisma.deliverySlot.findMany({
      where: { date: { gte: since }, active: true },
      orderBy: { date: "asc" },
      include: slotInclude,
    }),
    prisma.deliverySlot.findMany({
      where: { date: { lt: since }, active: true },
      orderBy: { date: "desc" },
      take: 10,
      include: slotInclude,
    }),
  ]);

  const noCutoff = (s: { date: Date }) => ({ date: s.date, orderCutoff: null });
  const upcomingSlots = recentAndFutureSlots.filter((s) => !isPickupPast(noCutoff(s), now)).slice(0, 5);
  // Archivadas: las que ya pasaron, la más reciente primero.
  const archivedSlots = [
    ...recentAndFutureSlots.filter((s) => isPickupPast(noCutoff(s), now)).reverse(),
    ...olderSlots,
  ].slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-brown">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Resumen de pedidos y stock</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Pedidos totales" value={totalOrders} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Pagados" value={paidOrders} color="text-green-600" />
        <StatCard icon={<Package className="w-5 h-5" />} label="Pendientes" value={pendingOrders} color="text-amber" />
      </div>

      {/* Upcoming slots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl font-bold text-brown">Próximas fechas</h2>
          <Link href="/admin/fechas" className="text-sm text-amber hover:underline">Ver todas →</Link>
        </div>

        <div className="space-y-3">
          {upcomingSlots.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-border p-6 text-center text-muted text-sm">
              No hay fechas activas. <Link href="/admin/fechas" className="text-amber hover:underline">Agregar fechas</Link>
            </div>
          )}
          {upcomingSlots.map((slot) => <SlotCard key={slot.id} slot={slot} />)}
        </div>
      </div>

      {/* Fechas archivadas: ya pasó el día de retiro */}
      {archivedSlots.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 text-sm text-muted hover:text-brown transition-colors py-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            Ver {archivedSlots.length} fecha{archivedSlots.length !== 1 ? "s" : ""} archivada{archivedSlots.length !== 1 ? "s" : ""}
          </summary>
          <div className="space-y-3 mt-3 opacity-80">
            {archivedSlots.map((slot) => <SlotCard key={slot.id} slot={slot} />)}
          </div>
        </details>
      )}
    </div>
  );
}

type DashboardSlot = {
  id: number;
  date: Date;
  dayLabel: string;
  orders: unknown[];
  stocks: { id: number; totalStock: number; reservedStock: number; product: { name: string } }[];
};

function SlotCard({ slot }: { slot: DashboardSlot }) {
  const activeOrders = slot.orders.length;
  return (
    <div className="bg-white rounded-2xl border-2 border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-amber" />
          <div>
            <p className="font-semibold text-charcoal">{slot.dayLabel}</p>
            <p className="text-xs text-muted">
              {new Date(slot.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              {" · Retiro"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-brown">{activeOrders} pedido{activeOrders !== 1 ? "s" : ""}</p>
          <Link href={`/admin/pedidos?slotId=${slot.id}`} className="text-xs text-amber hover:underline">
            Ver pedidos
          </Link>
        </div>
      </div>

      {slot.stocks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2">
          {slot.stocks.map((s) => {
            const available = s.totalStock - s.reservedStock;
            return (
              <div key={s.id} className="text-center">
                <p className="text-xs text-muted">{s.product.name}</p>
                <p className={`text-sm font-bold ${available === 0 ? "text-red-500" : "text-green-600"}`}>
                  {available}/{s.totalStock}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color = "text-brown" }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-border p-5">
      <div className="text-amber mb-2">{icon}</div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}
