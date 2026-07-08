import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BROT 74 — Caso de éxito: IA de punta a punta",
  description:
    "Cómo se construyó brot74.com de punta a punta con IA como parte del equipo: proceso, herramientas y decisiones de ingeniería.",
};

export default function ComoSeHizoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
