"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarIcon, PinIcon } from "@/components/FlowIcons";

function InfoRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className="flex items-center gap-2" style={{ padding: "14px 0", borderBottom: last ? "none" : "1px solid rgba(14,35,60,.10)" }}>
      <span className="flex-none flex">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>{label}</div>
        <div className="text-[16px] leading-[1.25] text-navy whitespace-nowrap overflow-hidden text-ellipsis">{value}</div>
      </div>
    </div>
  );
}

function ConfirmacionContent() {
  const params  = useSearchParams();
  const orderId = params.get("order");
  const pickup  = params.get("pickup");
  const place   = params.get("place");

  // v45 editorial: sin tarjeta, composición a la izquierda y el CTA anclado
  // abajo; v48: sin el filete suelto de arriba.
  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-[480px] px-5 pt-[18px] pb-[30px] flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col justify-center py-10">
          {/* Sello — mismo logo que el footer de la landing */}
          <Image
            src="/assets/logo-sello-mono-navy-transparente.png"
            alt="BROT 74"
            width={2400}
            height={2400}
            priority
            style={{ width: "96px", height: "auto", display: "block" }}
          />

          {orderId && (
            <div className="brot-mlabel brot-mlabel-amber mt-[22px]" style={{ fontWeight: 500 }}>
              Pedido #{orderId}
            </div>
          )}

          <h1 className="brot-h mt-[10px]" style={{ fontSize: "44px" }}>
            Ya pediste<br />tu <span style={{ color: "#C8851A" }}>BROT</span>
          </h1>

          <p className="text-[16px] leading-[1.5] text-stone mt-[14px] mb-0" style={{ maxWidth: "34ch" }}>
            Cuando se acredite la transferencia, te confirmamos por WhatsApp.
          </p>

          {(pickup || place) && (
            <div className="mt-[18px]">
              {pickup && <InfoRow icon={<CalendarIcon />} label="Retiro" value={pickup} last={!place} />}
              {place && <InfoRow icon={<PinIcon />} label="Lugar" value={place} last />}
            </div>
          )}
        </div>

        <Link href="/" className="brot-pill no-underline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense>
      <ConfirmacionContent />
    </Suspense>
  );
}
