"use client";

import Image from "next/image";
import { X, Minus, Plus, ShoppingBag, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Product {
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
}

interface ProductModalProps {
  product: Product;
  quantity: number;
  slotSelected: boolean;
  cartCount: number;
  cartTotal: number;
  onAdd: () => void;
  onRemove: () => void;
  onClose: () => void;
  onCheckout: () => void;
}

export default function ProductModal({
  product,
  quantity,
  slotSelected,
  cartCount,
  cartTotal,
  onAdd,
  onRemove,
  onClose,
  onCheckout,
}: ProductModalProps) {
  const remaining = product.stock !== null ? product.stock - quantity : null;
  const canAdd = slotSelected && product.hasStock && (remaining === null || remaining > 0);
  const canRemove = quantity > 0;

  const stockColor =
    remaining === null
      ? "text-green-600"
      : remaining >= 3
      ? "text-green-600"
      : remaining > 0
      ? "text-amber"
      : "text-red-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-cream rounded-3xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto flex-1">
          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur rounded-full p-2 shadow-md hover:bg-white transition-colors"
          >
            <X className="w-4 h-4 text-charcoal" />
          </button>

          {/* Imagen */}
          {product.imageUrl && (
            <div className="aspect-[4/3] relative w-full overflow-hidden rounded-t-3xl shrink-0">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                style={{ objectPosition: `${product.focalX}% ${product.focalY}%` }}
                sizes="448px"
              />
            </div>
          )}

          <div className="p-6 space-y-4">
            {/* Nombre + precio */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-2xl font-bold text-brown leading-tight">
                  {product.name}
                </h2>
                {product.weight && (
                  <p className="text-sm text-muted mt-0.5">{product.weight}</p>
                )}
              </div>
              <p className="font-bold text-xl text-amber shrink-0">
                {formatCurrency(product.price)}
              </p>
            </div>

            {/* Descripción */}
            {product.description && (
              <p className="text-sm text-muted leading-relaxed">{product.description}</p>
            )}

            {/* Ingredientes */}
            {product.ingredients && (
              <p className="text-xs text-muted/70 italic leading-relaxed">
                🌾 {product.ingredients}
              </p>
            )}

            {/* Stock */}
            {slotSelected && remaining !== null && (
              <p className={`text-xs font-semibold ${stockColor}`}>
                {remaining <= 0
                  ? "Sin stock para esta fecha"
                  : `${remaining} disponible${remaining !== 1 ? "s" : ""}`}
              </p>
            )}

            {!slotSelected && (
              <p className="text-xs text-brown/70 bg-amber/10 rounded-xl px-3 py-2">
                ↑ Elegí una fecha de entrega para poder agregar al pedido
              </p>
            )}

            {/* Controles de cantidad */}
            {slotSelected && (
              <div className="pt-1 pb-2">
                {quantity === 0 ? (
                  <button
                    onClick={onAdd}
                    disabled={!canAdd}
                    className="w-full bg-brown text-cream rounded-2xl py-3.5 font-semibold text-sm hover:bg-charcoal transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {canAdd ? "Agregar al pedido" : "Sin stock"}
                  </button>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 bg-white rounded-2xl border-2 border-border px-4 py-3">
                      <button
                        onClick={onRemove}
                        disabled={!canRemove}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-cream hover:bg-border transition-colors disabled:opacity-30"
                      >
                        <Minus className="w-4 h-4 text-brown" />
                      </button>
                      <span className="font-bold text-brown text-lg w-5 text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={onAdd}
                        disabled={!canAdd}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-brown text-cream hover:bg-charcoal transition-colors disabled:opacity-30"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted">Subtotal</p>
                      <p className="font-bold text-brown text-lg">
                        {formatCurrency(product.price * quantity)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Barra de carrito — solo si hay items */}
        {cartCount > 0 && (
          <button
            onClick={onCheckout}
            className="flex items-center justify-between px-5 py-4 border-t border-border bg-brown text-cream rounded-b-3xl hover:bg-charcoal transition-colors shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-1.5">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold">
                {cartCount} producto{cartCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{formatCurrency(cartTotal)}</span>
              <ChevronRight className="w-4 h-4 text-white/70" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
