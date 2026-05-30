"use client";

import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

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
  stock,
  hasStock,
  quantity,
  slotSelected,
  onClick,
}: ProductCardProps) {
  const remaining = stock !== null ? stock - quantity : null;
  const outOfStock = slotSelected && remaining !== null && remaining <= 0 && quantity === 0;
  const isDisabled = !slotSelected || outOfStock;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`relative bg-white rounded-2xl overflow-hidden text-left w-full transition-all duration-200 ${
        outOfStock
          ? "opacity-50 grayscale-[30%] cursor-not-allowed"
          : !slotSelected
          ? "opacity-60 cursor-not-allowed"
          : "shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
      }`}
    >
      {/* Imagen */}
      <div className="aspect-square relative w-full bg-cream">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover" style={{ objectPosition: `${focalX}% ${focalY}%` }} sizes="(max-width: 640px) 50vw, 300px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-amber opacity-30" />
          </div>
        )}

        {/* Badge cantidad */}
        {quantity > 0 && (
          <div className="absolute top-2 right-2 bg-brown text-cream rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md">
            {quantity}
          </div>
        )}

        {/* Badge últimas unidades */}
        {slotSelected && remaining !== null && remaining <= 2 && remaining > 0 && (
          <div className="absolute top-2 left-2 bg-amber text-white rounded-full px-2 py-0.5 text-xs font-semibold shadow">
            Últimos {remaining}
          </div>
        )}

        {/* Overlay sin stock */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <span className="text-xs font-semibold text-muted bg-white/90 px-3 py-1 rounded-full">Sin stock</span>
          </div>
        )}

      </div>

      {/* Info debajo */}
      <div className="p-3 pb-4">
        <p className="font-serif font-bold text-brown text-sm leading-snug">{name}</p>
        {weight && <p className="text-xs text-muted mt-0.5">{weight}</p>}
        <p className="font-bold text-amber text-sm mt-1.5">{formatCurrency(price)}</p>
      </div>
    </button>
  );
}
