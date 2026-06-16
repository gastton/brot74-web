"use client";

import Image from "next/image";
import { formatCurrency } from "@/lib/utils";

interface ProductCardProps {
  id: number;
  name: string;
  description: string;
  price: number;
  weight: string;
  ingredients: string;
  imageUrl: string;
  focalX: number;
  focalY: number;
  imageScale: number;
  stock: number | null;
  hasStock: boolean;
  quantity: number;
  slotSelected: boolean;
  onClick: () => void;
}

export default function ProductCard({
  name,
  price,
  weight,
  imageUrl,
  focalX,
  focalY,
  imageScale,
  stock,
  hasStock,
  quantity,
  slotSelected,
  onClick,
}: ProductCardProps) {
  const remaining = stock !== null ? stock - quantity : null;
  const outOfStock = slotSelected && !hasStock && stock !== null && stock <= 0;
  const isDisabled = !slotSelected || outOfStock;

  return (
    <div
      onClick={() => { if (!isDisabled) onClick(); }}
      className="flex flex-col"
      style={{
        cursor: isDisabled ? "default" : "pointer",
        transition: "transform .18s cubic-bezier(.2,.7,.3,1)",
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
      }}
    >
      {/* Foto */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: "1/1",
          borderRadius: "16px",
          background: "#ddd6c8",
          border: "1px solid rgba(14,35,60,.08)",
          boxShadow: isDisabled ? "none" : "0 16px 28px -22px rgba(14,35,60,.45)",
        }}
      >
        {imageUrl ? (
          <div
            className="absolute inset-0 bg-cover"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: `${focalX}% ${focalY}%`,
              transform: `scale(${imageScale})`,
              transformOrigin: `${focalX}% ${focalY}%`,
              transition: "transform .3s cubic-bezier(.2,.7,.3,1)",
              filter: outOfStock ? "grayscale(.85) brightness(1.04)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) e.currentTarget.style.transform = `scale(${Math.max(imageScale, 1) * 1.04})`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = `scale(${imageScale})`;
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[#ddd6c8]" />
        )}

        {/* Velo sin stock */}
        {outOfStock && (
          <div className="absolute inset-0" style={{ background: "rgba(244,238,226,.5)" }} />
        )}

        {/* Badge sin stock */}
        {outOfStock && (
          <span
            className="absolute top-3 left-3 font-bold text-[11.5px] tracking-[.04em] px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{
              background: "rgba(248,243,234,.78)",
              backdropFilter: "blur(5px)",
              WebkitBackdropFilter: "blur(5px)",
              color: "#7C766A",
              boxShadow: "0 3px 10px -5px rgba(0,0,0,.35)",
            }}
          >
            Sin stock
          </span>
        )}

        {/* Badge cantidad en carrito */}
        {quantity > 0 && !outOfStock && (
          <div
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "#0E233C", color: "#F4EEE2", boxShadow: "0 2px 8px rgba(14,35,60,.4)" }}
          >
            {quantity}
          </div>
        )}

        {/* Badge últimas unidades */}
        {slotSelected && remaining !== null && remaining <= 2 && remaining > 0 && (
          <div
            className="absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "#C8851A", color: "#F4EEE2" }}
          >
            Últimos {remaining}
          </div>
        )}
      </div>

      {/* Texto */}
      <div
        className="pt-3 px-0.5"
        style={{ opacity: outOfStock ? 0.5 : 1 }}
      >
        <div className="font-semibold text-[16.5px] text-navy leading-snug">{name}</div>
        {weight && (
          <div className="font-medium text-[12.5px] text-stone mt-0.5">{weight}</div>
        )}
        <div className="font-bold text-[15.5px] mt-2" style={{ color: "#C8851A" }}>
          {formatCurrency(price)}
        </div>
      </div>
    </div>
  );
}
