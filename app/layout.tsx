import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BROT.74 — Pan Artesanal",
  description: "Pedidos de pan artesanal de fermentación natural.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={hanken.variable}>
      <body className="min-h-screen bg-cream antialiased">
        {children}
      </body>
    </html>
  );
}
