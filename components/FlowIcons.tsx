// Íconos de línea ámbar, sin círculo (v46): Retiro / Lugar / Pedidos hasta.
// TruckIcon: zona de las fechas de delivery (en vez del pin del lugar de retiro).
const common = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "#C8851A",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ClockIcon() {
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 4.6v1.2M19.4 12h-1.2M12 19.4v-1.2M4.6 12h1.2" strokeWidth="1.4" />
      <path d="M12 12V7.8M12 12l3.2 2" />
      <circle cx="12" cy="12" r="1.1" fill="#C8851A" stroke="none" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg {...common}>
      <path d="M12 21.5s-6.5-5.6-6.5-11.2a6.5 6.5 0 0 1 13 0c0 5.6-6.5 11.2-6.5 11.2z" />
      <circle cx="12" cy="10.2" r="2.4" fill="#C8851A" stroke="none" />
    </svg>
  );
}

export function TruckIcon() {
  return (
    <svg {...common}>
      <path d="M4.5 6h7.5a1.5 1.5 0 0 1 1.5 1.5V16.5H3V7.5A1.5 1.5 0 0 1 4.5 6z" />
      <path d="M13.5 9.5h3.6l3.4 3.6v3.4h-1.3" />
      <path d="M8.9 16.5h6.2" />
      <circle cx="6.9" cy="17.4" r="1.9" />
      <circle cx="6.9" cy="17.4" r=".7" fill="#C8851A" stroke="none" />
      <circle cx="17.1" cy="17.4" r="1.9" />
      <circle cx="17.1" cy="17.4" r=".7" fill="#C8851A" stroke="none" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg {...common}>
      <path d="M6 5h12a2.5 2.5 0 0 1 2.5 2.5v11A2.5 2.5 0 0 1 18 21H6a2.5 2.5 0 0 1-2.5-2.5v-11A2.5 2.5 0 0 1 6 5z" />
      <path d="M3.5 10h17" />
      <path d="M8 2.75v4.5M16 2.75v4.5" strokeWidth="1.8" />
      <circle cx="8" cy="14" r=".9" fill="#C8851A" stroke="none" />
      <circle cx="12" cy="14" r=".9" fill="#C8851A" stroke="none" />
      <circle cx="8" cy="17.5" r=".9" fill="#C8851A" stroke="none" />
      <circle cx="12" cy="17.5" r=".9" fill="#C8851A" stroke="none" />
      <rect x="14.6" y="12.6" width="3.2" height="3.2" rx=".8" fill="#C8851A" stroke="none" />
    </svg>
  );
}
