export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getNextDeliveryDates(weeksAhead = 4): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = 0; i < weeksAhead * 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const day = d.getDay();
    if (day === 1 || day === 6) {
      dates.push(d);
    }
  }
  return dates;
}
