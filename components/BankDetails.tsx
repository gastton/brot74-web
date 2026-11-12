"use client";

import { useState } from "react";

// Datos para transferir al alias — orden: Titular, CUIT/CUIL, Alias, CVU.
// Copiar solo en Alias y CVU. Lo usan el paso de pago del checkout
// (OrderModal) y "Todavía no pagaste" a la vuelta de Mercado Pago.

const CVU     = process.env.NEXT_PUBLIC_CVU     ?? "";
const ALIAS   = process.env.NEXT_PUBLIC_ALIAS   ?? "";
const TITULAR = process.env.NEXT_PUBLIC_TITULAR ?? "";
const CUIT    = process.env.NEXT_PUBLIC_CUIT    ?? "";

const ROW_BORDER = "1px solid rgba(14,35,60,.10)";

function DataRow({ label, children, border = true }: { label: string; children: React.ReactNode; border?: boolean }) {
  return (
    <div className="flex items-center gap-2" style={{ padding: "10px 0", borderBottom: border ? ROW_BORDER : "none" }}>
      <div className="flex-1 min-w-0">
        <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>{label}</div>
        {children}
      </div>
    </div>
  );
}

function CopyButton({ value, label, onCopied }: { value: string; label: string; onCopied?: (text: string) => void }) {
  const [copied, setCopied] = useState(false); // feedback transitorio del botón (1.4s)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
        onCopied?.(`${label} copiado`);
      }}
      className="brot-ghost brot-ghost--xs"
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export default function BankDetails({ onCopied }: { onCopied?: (text: string) => void }) {
  return (
    <>
      {TITULAR && (
        <DataRow label="Titular">
          <div className="text-[16px] text-navy mt-[2px] break-words">{TITULAR}</div>
        </DataRow>
      )}
      {CUIT && (
        <DataRow label="CUIT / CUIL">
          <div className="text-[16px] text-navy mt-[2px] break-all" style={{ fontVariantNumeric: "tabular-nums" }}>{CUIT}</div>
        </DataRow>
      )}
      {ALIAS && (
        <div className="flex items-center gap-2" style={{ padding: "10px 0", borderBottom: CVU ? ROW_BORDER : "none" }}>
          <div className="flex-1 min-w-0">
            <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>Alias</div>
            <div className="text-[18px] text-navy mt-[2px] break-all">{ALIAS}</div>
          </div>
          <CopyButton value={ALIAS} label="Alias" onCopied={onCopied} />
        </div>
      )}
      {CVU && (
        <div className="flex items-center gap-2" style={{ padding: "10px 0" }}>
          <div className="flex-1 min-w-0">
            <div className="brot-mlabel brot-mlabel-amber" style={{ fontWeight: 500 }}>CVU</div>
            <div className="text-[16px] text-navy mt-[2px] break-all" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: ".03em" }}>{CVU}</div>
          </div>
          <CopyButton value={CVU} label="CVU" onCopied={onCopied} />
        </div>
      )}
    </>
  );
}
