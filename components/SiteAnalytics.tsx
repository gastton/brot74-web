"use client";

import { Analytics } from "@vercel/analytics/next";

// Vercel Web Analytics (sin cookies). Las páginas del admin no se cuentan:
// son visitas del equipo, no del público.
export default function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => (new URL(event.url).pathname.startsWith("/admin") ? null : event)}
    />
  );
}
