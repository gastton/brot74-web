interface ImagePlaceholderProps {
  className?: string;
  label?: string;
}

// Placeholder para slots de foto que todavía no tienen asset real —
// BROT74 no tiene fotos de local, y el esqueleto nuevo (inspirado en
// tobrod.dk) asume una foto grande a sangre en el hero que hoy no
// existe. Textura plana + marca de agua del ramillete, sin pretender
// ser una foto real; reemplazar por fotografía real cuando esté lista.
//
// No trae position propio a propósito — el caller SIEMPRE tiene que
// pasar la suya (ej. "absolute inset-0") vía className. Si el componente
// trajera "relative" hardcodeado, un className con "absolute" quedaría
// compitiendo por la propiedad position y el resultado depende del
// orden interno de las utilities de Tailwind, no del className — así se
// rompió la primera versión (el placeholder no llegaba a cubrir el hero).
export default function ImagePlaceholder({ className, label }: ImagePlaceholderProps) {
  return (
    <div className={`flex items-center justify-center overflow-hidden bg-[#EDE6D6] ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ramillete-mono-navy.png" alt="" className="w-1/3 max-w-[220px] opacity-[.12]" />
      {label && (
        <span className="absolute bottom-4 left-4 text-navy/40 text-[11px] font-semibold uppercase tracking-[.15em]">
          {label}
        </span>
      )}
    </div>
  );
}
