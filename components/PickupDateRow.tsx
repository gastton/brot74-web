import { CalendarIcon } from "./FlowIcons";

// v49: fila de fecha de retiro compartida por "Elegí tu BROT" (2) y
// "Tu pedido" (4): ícono calendario ámbar + "Sábado 27 · 10:00 a 13:00".
// Sin rótulo, sin filetes y sin padding vertical; va arriba del título.
// En fechas de delivery el ícono es el camión (mismo glifo que la tarjeta de fecha).
export function formatPickupDate(date: string, pickupTime?: string): string {
  const d = new Date(date);
  const weekday = d.toLocaleDateString("es-AR", { weekday: "long" });
  const label = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${d.getDate()}`;
  return pickupTime ? `${label} · ${pickupTime}` : label;
}

export default function PickupDateRow({ date, pickupTime, isDelivery }: { date: string; pickupTime?: string; isDelivery?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-none flex"><CalendarIcon /></span>
      <div className="flex-1 min-w-0 text-[16px] leading-[1.25] text-navy whitespace-nowrap overflow-hidden text-ellipsis">
        {formatPickupDate(date, pickupTime && isDelivery ? `Entrega ${pickupTime}` : pickupTime)}
      </div>
    </div>
  );
}
