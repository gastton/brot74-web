import { formatCurrency } from "@/lib/utils";

// v51 · Descuento: precio original tachado + precio con descuento.
// Sin descuento (discountPrice null) se ve solo el precio, igual que antes.
interface PriceTagProps {
  price: number;
  discountPrice?: number | null;
  size: number;      // px del precio vigente
  oldSize: number;   // px del precio tachado
  color?: string;
  stacked?: boolean; // tachado arriba (modal)
  className?: string;
}

export default function PriceTag({ price, discountPrice, size, oldSize, color = "#8A5A0E", stacked = false, className = "" }: PriceTagProps) {
  const on = discountPrice != null && discountPrice > 0 && discountPrice < price;
  return (
    <span
      className={`${stacked ? "inline-flex flex-col items-end" : "inline-flex items-baseline gap-2"} whitespace-nowrap flex-none ${className}`}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {on && (
        <s className="font-normal" style={{ color: "#4A5463", fontSize: `${oldSize}px`, lineHeight: 1.2 }}>
          <span className="sr-only">Precio anterior: </span>
          {formatCurrency(price)}
        </s>
      )}
      <span className="font-medium" style={{ color, fontSize: `${size}px` }}>
        {on && <span className="sr-only">Precio con descuento: </span>}
        {formatCurrency(on ? (discountPrice as number) : price)}
      </span>
    </span>
  );
}
