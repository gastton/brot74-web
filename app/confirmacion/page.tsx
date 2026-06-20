"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function WheatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8851A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>
      <path d="M12 21V8"/>
      <path d="M12 8c0-2 1.4-3.4 3-4-.2 2-1.2 3.4-3 4Zm0 0c0-2-1.4-3.4-3-4 .2 2 1.2 3.4 3 4Z"/>
      <path d="M12 13c0-1.8 1.3-3 2.8-3.6-.2 1.8-1.1 3-2.8 3.6Zm0 0c0-1.8-1.3-3-2.8-3.6.2 1.8 1.1 3 2.8 3.6Z"/>
      <path d="M12 18c0-1.8 1.3-3 2.8-3.6-.2 1.8-1.1 3-2.8 3.6Zm0 0c0-1.8-1.3-3-2.8-3.6.2 1.8 1.1 3 2.8 3.6Z"/>
    </svg>
  );
}

function ConfirmacionContent() {
  const params  = useSearchParams();
  const status  = params.get("status");
  const orderId = params.get("order");

  const isSuccess = status === "success" || status === "approved";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-cream">
      <div
        className="brot-ok-card w-full text-center"
        style={{
          maxWidth: "420px",
          background: "#fff",
          border: "1px solid rgba(14,35,60,.07)",
          borderRadius: "24px",
          boxShadow: "0 36px 70px -30px rgba(14,35,60,.42)",
          padding: "44px 36px 36px",
        }}
      >
        {/* Sello / logo */}
        <div
          className="mseal navy mx-auto"
          style={{ width: "116px", height: "116px", fontSize: "116px", filter: "drop-shadow(0 14px 26px rgba(14,35,60,.28))" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ramillete-mono-amber.png" alt="BROT 74" />
          <div className="wm">
            <span className="b">BROT</span>
            <span className="n">74</span>
          </div>
        </div>

        {/* Título */}
        <h1 className="font-bold text-[33px] tracking-[-0.01em] text-navy mt-[26px] mb-0">
          Tu BROT está reservado
        </h1>

        {/* Descripción */}
        <p className="font-medium text-[16.5px] leading-[1.5] text-stone mt-[14px] mx-auto" style={{ maxWidth: "30ch" }}>
          {isSuccess
            ? "Tu pago fue procesado con éxito."
            : "Recibimos tu pedido. El pago está siendo procesado."}
        </p>

        {/* Número de pedido */}
        {orderId && (
          <div className="font-semibold text-[14px] mt-[14px]" style={{ color: "#A8A296" }}>
            Pedido #{orderId}
          </div>
        )}

        {/* Pill WhatsApp */}
        <div
          className="mt-[26px] flex items-center justify-center gap-[6px] flex-wrap font-semibold text-[16px] leading-[1.45] text-navy"
          style={{ background: "#FBF1DF", borderRadius: "16px", padding: "18px 22px" }}
        >
          Nos vamos a comunicar por WhatsApp para confirmarte el pedido.
          <WheatIcon />
        </div>

        {/* CTA Volver */}
        <Link
          href="/"
          className="mt-6 block w-full font-bold text-[16.5px] tracking-[.01em] py-[17px] rounded-[14px] no-underline flex items-center justify-center"
          style={{
            background: "#0E233C",
            color: "#F4EEE2",
            transition: "transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 30px -16px rgba(14,35,60,.55)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "";
            (e.currentTarget as HTMLElement).style.boxShadow = "";
          }}
        >
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
