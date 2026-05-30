import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const poppins = localFont({
  src: [
    { path: "../font/poppins/Poppins-Regular.ttf",   weight: "400", style: "normal" },
    { path: "../font/poppins/Poppins-Italic.ttf",    weight: "400", style: "italic" },
    { path: "../font/poppins/Poppins-Medium.ttf",    weight: "500", style: "normal" },
    { path: "../font/poppins/Poppins-SemiBold.ttf",  weight: "600", style: "normal" },
    { path: "../font/poppins/Poppins-Bold.ttf",      weight: "700", style: "normal" },
    { path: "../font/poppins/Poppins-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "../font/poppins/Poppins-Black.ttf",     weight: "900", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BROT.74 — Pan Artesanal",
  description: "Pedidos de pan artesanal. Lunes retiro, Sábado delivery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={poppins.variable}>
      <body className="min-h-screen bg-cream text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
