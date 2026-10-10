"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";

function ClockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0E233C" strokeWidth="1.6" strokeLinecap="round">
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>
    </svg>
  );
}

function InfoRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className="flex items-center gap-3" style={{ padding: "14px 0", borderBottom: last ? "none" : "1px solid rgba(14,35,60,.10)" }}>
      <span className="brot-ring">{icon}</span>
      <div>
        <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>{label}</div>
        <div className="text-[16px] leading-[1.25] text-navy">{value}</div>
      </div>
    </div>
  );
}

function ConfirmacionContent() {
  const params  = useSearchParams();
  const status  = params.get("status");
  const orderId = params.get("order");
  const pickup  = params.get("pickup");
  const place   = params.get("place");

  const isSuccess = status === "success" || status === "approved";

  // v45 editorial: sin tarjeta, composición a la izquierda, un solo filete
  // navy arriba y el CTA anclado abajo.
  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-[480px] px-5 pt-[18px] pb-[30px] flex flex-col min-h-screen">
        <div className="brot-rule" />

        <div className="flex-1 flex flex-col justify-center py-10">
          {/* Sello — mismo logo que el footer de la landing */}
          <Image
            src="/assets/logo-sello-mono-navy-transparente.png"
            alt="BROT 74"
            width={2400}
            height={2400}
            priority
            style={{ width: "88px", height: "auto", display: "block" }}
          />

          {orderId && (
            <div className="brot-mlabel brot-mlabel-amber mt-[22px]" style={{ fontWeight: 500 }}>
              Pedido #{orderId}
            </div>
          )}

          <h1 className="brot-h mt-[10px]" style={{ fontSize: "44px" }}>
            Tu <span style={{ color: "#C8851A" }}>BROT</span><br />está reservado
          </h1>

          <p className="text-[16px] leading-[1.5] text-stone mt-[14px] mb-0" style={{ maxWidth: "34ch" }}>
            {isSuccess
              ? "Tu pago fue procesado con éxito."
              : "Recibimos tu pedido. El pago está siendo procesado."}
          </p>
          <p className="text-[16px] leading-[1.5] text-stone mt-2 mb-0" style={{ maxWidth: "34ch" }}>
            Una vez acreditado tu pago, recibirás un mensaje de WhatsApp de confirmación.
          </p>

          {(pickup || place) && (
            <div className="mt-[18px]">
              {pickup && <InfoRow icon={<ClockIcon />} label="Retiro" value={pickup} last={!place} />}
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
