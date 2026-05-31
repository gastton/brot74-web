"use client";

import { useState } from "react";
import { X, Loader2, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface OrderModalProps {
  items: CartItem[];
  slotId: number;
  isDelivery: boolean;
  slotLabel: string;
  onClose: () => void;
  onSuccess: (orderId: number, mpUrl?: string) => void;
}

export default function OrderModal({
  items,
  slotId,
  isDelivery,
  slotLabel,
  onClose,
  onSuccess,
}: OrderModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !phone.trim()) {
      setError("Nombre y teléfono son requeridos");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) {
      setError("El teléfono debe tener entre 8 y 15 dígitos");
      return;
    }
    if (isDelivery && !address.trim()) {
      setError("La dirección es requerida para delivery");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.replace(/\D/g, ""),
          customerAddress: address.trim(),
          deliverySlotId: slotId,
          notes: notes.trim(),
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al procesar el pedido");
        return;
      }

      onSuccess(data.orderId, data.initPoint);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-cream w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-cream border-b border-border px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="font-serif text-xl font-bold text-brown">Tu pedido</h2>
            <p className="text-xs text-muted mt-0.5">{slotLabel} · {isDelivery ? "Delivery" : "Retiro en casa"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-border transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Resumen */}
          <div className="bg-white rounded-xl border border-border p-4 space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-charcoal">
                  {item.name} <span className="text-muted">×{item.quantity}</span>
                </span>
                <span className="font-semibold text-brown">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
              <span className="text-charcoal">Total</span>
              <span className="text-brown text-lg">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">Nombre y apellido *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">Teléfono (WhatsApp) *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11 1234-5678"
                className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber bg-white"
                required
              />
            </div>

            {isDelivery && (
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Dirección de delivery *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. Corrientes 1234, CABA"
                  className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber bg-white"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alguna aclaración sobre tu pedido..."
                rows={2}
                className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber bg-white resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="bg-amber/10 border border-amber/30 rounded-xl px-4 py-3">
            <p className="text-xs text-brown/80 leading-relaxed">
              <strong>Pago por adelantado.</strong> Al confirmar serás redirigido a Mercado Pago para completar el pago de {formatCurrency(total)}.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 text-base py-4 rounded-xl"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ShoppingBag className="w-5 h-5" />
            )}
            {loading ? "Procesando..." : "Confirmar y pagar"}
          </button>
        </form>
      </div>
    </div>
  );
}
