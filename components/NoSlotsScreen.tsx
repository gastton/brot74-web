"use client";

import Image from "next/image";
import { useRef, useState } from "react";

// v57 · "Tu próximo BROT" sin fechas abiertas (Pedidos cerrados / "Avisame cuando
// abra"). Reemplaza a la card crema con sombra del v31: ahora usa el lenguaje de
// la landing y del flujo de pedidos (Jost, fondo blanco, filetes navy), con la foto
// de masa y la hoja crema "Próxima fecha / A confirmar" (misma pieza que la fecha,
// v55). Guarda { name, phone } en la lista de aviso.
const TERRA = "#A6442E";

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function NoSlotsScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({ name: false, phone: false });
  const [sentName, setSentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setServerError("");
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const next = { name: !trimmedName, phone: !trimmedPhone };
    setErrors(next);
    // Campo vacío → error y foco en el primero vacío.
    if (next.name || next.phone) {
      (next.name ? nameRef : phoneRef).current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, phone: trimmedPhone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar");
      }
      setSentName(trimmedName.split(/\s+/)[0]);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Error al guardar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-jost), system-ui, sans-serif", color: "#0E233C" }}>
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-[18px] pb-12 min-[900px]:pt-10 min-[900px]:pb-20 min-[900px]:px-[clamp(32px,4vw,68px)]">
        {/* Encabezado: igual al de la pantalla 1 */}
        <header>
          <h2 className="brot-h min-[900px]:!text-[56px]">
            Tu próximo<br /><span style={{ color: "#C8851A" }}>BROT</span>
          </h2>
          <div className="brot-rule mt-5" />
        </header>

        <div className="mt-[22px] grid grid-cols-1 min-[900px]:mt-10 min-[900px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] min-[900px]:items-start min-[900px]:gap-[clamp(40px,6vw,96px)]">
          {/* Foto + hoja crema */}
          <div className="relative -mx-5 h-[300px] min-[900px]:mx-0 min-[900px]:h-auto min-[900px]:aspect-square">
            {/* v59: foto de masa (antes el hero), encuadrada para que se vean las manos:
               mobile 45% 50%, desktop (cuadrada) 36% 50%. */}
            <Image
              src="/assets/pedidos-cerrados-masa.jpg"
              alt="Manos amasando sobre una mesa enharinada"
              fill
              priority
              sizes="(min-width: 900px) 600px, 100vw"
              className="object-cover object-[45%_50%] min-[900px]:object-[36%_50%]"
            />
            <div
              className="absolute left-5 -bottom-7 min-[900px]:left-6 min-[900px]:bottom-6 select-none"
              style={{ minWidth: "150px", background: "#F4EEE2", padding: "14px 16px 12px" }}
            >
              <div className="brot-rule" />
              <div style={{ marginTop: "12px", fontSize: "14px", fontWeight: 500, lineHeight: 1.55, letterSpacing: "1.76px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                Próxima fecha
              </div>
              <div style={{ marginTop: "4px", fontSize: "32px", fontWeight: 400, lineHeight: 0.94, letterSpacing: "-.02em", color: "#C8851A", whiteSpace: "nowrap" }}>
                A confirmar
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="pt-[52px] min-[900px]:pt-2 min-[900px]:max-w-[440px]">
            <div className="flex items-center gap-2" style={{ fontSize: "12px", letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 600, color: TERRA }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "currentColor" }} />
              Pedidos cerrados
            </div>
            <h3 className="text-[30px] min-[900px]:text-[36px]" style={{ fontWeight: 400, lineHeight: 1.05, letterSpacing: "-.02em", margin: "10px 0 0" }}>
              Está en el horno
            </h3>
            <p className="text-pretty" style={{ fontSize: "16px", lineHeight: 1.5, color: "#4A5463", margin: "12px 0 0", maxWidth: "42ch" }}>
              Horneamos por tandas, en cantidades limitadas. Dejanos tu contacto y te avisamos apenas se abra la próxima fecha.
            </p>

            {sentName !== null ? (
              <div aria-live="polite" style={{ marginTop: "28px", borderTop: "1px solid #0E233C", paddingTop: "16px" }}>
                <div style={{ fontSize: "22px", fontWeight: 400, letterSpacing: "-.01em" }}>Listo, {sentName}, te avisamos</div>
                <p style={{ fontSize: "16px", lineHeight: 1.5, color: "#4A5463", margin: "6px 0 0", maxWidth: "40ch" }}>
                  Apenas abramos la próxima tanda, sos de los primeros en enterarte.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col" style={{ marginTop: "28px" }}>
                <div style={{ paddingBottom: "8px", borderBottom: "1px solid rgba(14,35,60,.16)", fontSize: "12px", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 500, color: "#4A5463" }}>
                  Avisame cuando abra
                </div>
                <label className={`brot-fl${errors.name ? " is-err" : ""}`} style={{ marginTop: "4px" }}>
                  <span>Nombre</span>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: false })); }}
                    autoComplete="given-name"
                    autoCapitalize="words"
                    maxLength={40}
                    placeholder="Juan"
                    aria-invalid={errors.name}
                  />
                </label>
                <label className={`brot-fl${errors.phone ? " is-err" : ""}`} style={{ marginTop: "6px" }}>
                  <span>WhatsApp</span>
                  <input
                    ref={phoneRef}
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: false })); }}
                    autoComplete="tel"
                    placeholder="351 123-4567"
                    aria-invalid={errors.phone}
                  />
                </label>
                {serverError && (
                  <p role="alert" style={{ fontSize: "14px", color: TERRA, margin: "12px 0 0" }}>{serverError}</p>
                )}
                <button type="submit" disabled={loading} className="brot-pill" style={{ marginTop: "24px" }}>
                  {loading ? "Enviando…" : "Avisame cuando abra"}
                </button>
                <p style={{ fontSize: "14px", lineHeight: 1.45, color: "#4A5463", margin: "12px 0 0", textAlign: "center" }}>
                  Te escribimos una sola vez, para la próxima fecha. Sin spam.
                </p>
              </form>
            )}

            {/* Instagram: solo isotipo + @brot.74 */}
            <div className="flex justify-center min-[900px]:justify-start" style={{ marginTop: "28px", paddingTop: "6px", borderTop: "1px solid rgba(14,35,60,.16)" }}>
              <a
                href="https://www.instagram.com/brot.74"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="BROT 74 en Instagram, @brot.74"
                className="inline-flex items-center gap-[10px] min-h-[44px] px-[6px] no-underline transition-colors hover:!text-[#8A5A0E]"
                style={{ fontSize: "15px", fontWeight: 500, letterSpacing: ".02em", color: "#0E233C" }}
              >
                <InstagramGlyph />
                @brot.74
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
