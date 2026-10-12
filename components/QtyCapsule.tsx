"use client";

// Cápsula − cantidad + (v46): un solo borde, botones de 28px con área táctil
// de 44px. Si `minusIsTrash`, el − se convierte en tacho (quitar el pan).
interface QtyCapsuleProps {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  minusIsTrash?: boolean;
  minusLabel?: string;
  plusLabel?: string;
}

export default function QtyCapsule({
  value,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
  minusIsTrash,
  minusLabel = "Quitar uno",
  plusLabel = "Sumar uno",
}: QtyCapsuleProps) {
  return (
    <div className="brot-capsule">
      <button
        type="button"
        onClick={onMinus}
        disabled={minusDisabled}
        aria-label={minusIsTrash ? "Eliminar" : minusLabel}
        className={minusIsTrash ? "brot-capsule-trash" : undefined}
      >
        {minusIsTrash ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6.5 7l1 12.5h9l1-12.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
            <path d="M6 12h12" />
          </svg>
        )}
      </button>
      <span className="brot-capsule-q" aria-live="polite">{value}</span>
      <button type="button" onClick={onPlus} disabled={plusDisabled} aria-label={plusLabel}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
          <path d="M6 12h12M12 6v12" />
        </svg>
      </button>
    </div>
  );
}
