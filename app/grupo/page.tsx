import type { Metadata } from "next";
import Image from "next/image";
import JoinGroupLink from "@/components/JoinGroupLink";
import { getGroupInviteUrl } from "@/lib/whatsappGroup";

// Link único para compartir el grupo de WhatsApp con vista previa propia.
// No agregar un redirect del servidor a chat.whatsapp.com: el bot de WhatsApp
// lo seguiría y mostraría la vista previa genérica del grupo.
// La imagen sale de opengraph-image.jpg / twitter-image.jpg de esta carpeta.
const OG_TITLE = "BROT 74 · Pan de masa madre";
const OG_DESCRIPTION = "Sin conservantes ni aditivos. Preventa semanal · @brot.74";
const DESCRIPTION = "Pan de masa madre hecho con harina, agua, sal y tiempo. Avisamos cada hornada por acá.";

// El openGraph de la ruta reemplaza entero al del layout: se repiten siteName, locale y type.
export const metadata: Metadata = {
  title: "Sumate al grupo de BROT 74",
  description: DESCRIPTION,
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: "/grupo",
    siteName: "BROT 74",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
  },
};

const HOW_IT_WORKS = [
  "Cada semana aviso en el grupo qué panes salen en la tanda.",
  "Pedís por privado, hasta la fecha límite de cada tanda.",
  "Retirás tu pan o te lo llevo.",
];

export default function GrupoPage() {
  const inviteUrl = getGroupInviteUrl();

  return (
    <main className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-[480px] px-5 pt-[18px] pb-[30px] flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col justify-center py-4">
          <Image
            src="/assets/logo-sello-mono-navy-transparente.png"
            alt="BROT 74"
            width={2400}
            height={2400}
            sizes="96px"
            priority
            style={{ width: "96px", height: "auto", display: "block" }}
          />

          <h1 className="brot-h" style={{ fontSize: "44px", marginTop: "18px" }}>
            Sumate al grupo de <span className="text-amber whitespace-nowrap">BROT 74</span>
          </h1>

          <p className="text-[16px] leading-[1.5] text-stone mt-[14px] mb-0">
            Sin conservantes ni aditivos. Preventa semanal.
          </p>

          <h2 className="brot-mlabel brot-mlabel-amber mt-[22px] mb-0">Cómo funciona</h2>
          <ol className="list-none m-0 p-0 mt-[6px]">
            {HOW_IT_WORKS.map((item, i) => (
              <li
                key={item}
                className="flex gap-3 py-[14px] text-[16px] leading-[1.4] text-navy"
                style={{ borderBottom: i < HOW_IT_WORKS.length - 1 ? "var(--brot-hair-soft)" : undefined }}
              >
                <span className="flex-none w-3 text-amber-ink font-medium" aria-hidden="true">{i + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </div>

        {inviteUrl ? (
          <>
            <JoinGroupLink href={inviteUrl} />
            <p className="text-center text-[14px] leading-[1.4] text-stone mt-[12px] mb-0">
              Solo escribo yo. Podés salir cuando quieras.
            </p>
          </>
        ) : (
          <p className="text-center text-[16px] leading-[1.5] text-navy m-0">
            Escribinos por Instagram{" "}
            <a href="https://www.instagram.com/brot.74" className="underline" rel="noopener">@brot.74</a> para sumarte.
          </p>
        )}
      </div>
    </main>
  );
}
