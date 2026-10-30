import type { Metadata } from "next";
import { Hanken_Grotesk, Jost } from "next/font/google";
import SiteAnalytics from "@/components/SiteAnalytics";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-hanken",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  // BRT-136: la landing nueva usa Jost 300 como peso de cuerpo (antes el
  // sitio solo cargaba 400-700, usado nada más para el wordmark del sello).
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jost",
  display: "swap",
});

// Vista previa al compartir el link (WhatsApp, redes): usa los tags Open Graph.
// La imagen sale de app/opengraph-image.jpg (1200x630) y app/twitter-image.jpg;
// metadataBase hace que Next arme su URL absoluta (WhatsApp no sigue relativas).
export const metadata: Metadata = {
  metadataBase: new URL("https://brot74.com"),
  title: "BROT 74",
  description: "Pan Artesanal",
  openGraph: {
    title: "BROT 74",
    description: "Pan Artesanal",
    url: "/",
    siteName: "BROT 74",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BROT 74",
    description: "Pan Artesanal",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${hanken.variable} ${jost.variable}`}>
      <body className="min-h-screen bg-cream antialiased">
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
