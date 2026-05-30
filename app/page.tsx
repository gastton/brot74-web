"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ShoppingBag, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import DateSelector from "@/components/DateSelector";
import OrderModal from "@/components/OrderModal";
import InstagramIcon from "@/components/InstagramIcon";
import { formatCurrency } from "@/lib/utils";

interface Slot {
  id: number | null;
  date: string;
  dayLabel: string;
  isDelivery: boolean;
  disabled: boolean;
}

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

type CartMap = Record<number, number>;

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartMap>({});
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    fetch("/api/delivery-slots")
      .then((r) => r.json())
      .then((data) => setSlots(data))
      .finally(() => setLoadingSlots(false));
  }, []);

  const fetchProducts = useCallback((slotId: number) => {
    setLoadingProducts(true);
    fetch(`/api/products?slotId=${slotId}`)
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    if (selectedSlotId) {
      fetchProducts(selectedSlotId);
      setCart({});
    } else {
      fetch("/api/products")
        .then((r) => r.json())
        .then(setProducts);
    }
  }, [selectedSlotId, fetchProducts]);

  function addToCart(productId: number) {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  }

  function removeFromCart(productId: number) {
    setCart((prev) => {
      const next = { ...prev };
      if ((next[productId] ?? 0) <= 1) delete next[productId];
      else next[productId]--;
      return next;
    });
  }

  const cartItems = products
    .filter((p) => (cart[p.id] ?? 0) > 0)
    .map((p) => ({ id: p.id, name: p.name, price: p.price, quantity: cart[p.id] }));

  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  function handleOrderSuccess(orderId: number, mpUrl?: string) {
    setShowModal(false);
    if (mpUrl) {
      window.location.href = mpUrl;
    } else {
      window.location.href = `/confirmacion?order=${orderId}&status=pending`;
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="BROT.74"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
            <p className="text-base font-medium text-muted leading-none">Pan Natural</p>
          </div>
          <a
            href="https://instagram.com/brot.74"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted hover:text-brown transition-colors"
          >
            <InstagramIcon className="w-5 h-5" />
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        {/* Hero */}
        <section className="text-center pt-2">
          <p className="text-sm uppercase tracking-widest text-amber font-semibold mb-2">Pedidos online</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-brown mb-4 leading-tight">
            Elegí tu BROT
          </h2>
          <p className="text-muted max-w-sm mx-auto text-sm leading-relaxed">
            Selecciona el día y el tipo de pan. Así de simple...como el pan
          </p>
        </section>

        {/* Fecha */}
        <section>
          <h3 className="font-serif text-xl font-bold text-brown mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber text-white text-xs flex items-center justify-center font-bold">1</span>
            Elegí la fecha
          </h3>
          {loadingSlots ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white rounded-2xl border-2 border-border animate-pulse" />
              ))}
            </div>
          ) : (
            <DateSelector slots={slots} selectedId={selectedSlotId} onChange={setSelectedSlotId} />
          )}
        </section>

        {/* Productos */}
        <section>
          <h3 className="font-serif text-xl font-bold text-brown mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber text-white text-xs flex items-center justify-center font-bold">2</span>
            Elegí tu pan
          </h3>

          {!selectedSlotId && (
            <div className="bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-brown/80">
                ↑ Primero elegí una fecha de entrega para ver el stock disponible.
              </p>
            </div>
          )}

          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 bg-white rounded-2xl border-2 border-border animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  quantity={cart[product.id] ?? 0}
                  slotSelected={!!selectedSlotId}
                  onClick={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Cart bar */}
      {cartItems.length > 0 && selectedSlotId && !selectedProduct && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-cream via-cream/95 to-transparent">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-brown text-cream rounded-2xl p-4 flex items-center justify-between shadow-lg hover:bg-charcoal transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-xl p-2">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">{cartItems.reduce((s, i) => s + i.quantity, 0)} producto{cartItems.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}</p>
                  <p className="text-xs text-white/70">{selectedSlot?.dayLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{formatCurrency(cartTotal)}</span>
                <ChevronRight className="w-5 h-5 text-white/70" />
              </div>
            </button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          quantity={cart[selectedProduct.id] ?? 0}
          slotSelected={!!selectedSlotId}
          cartCount={cartItems.reduce((s, i) => s + i.quantity, 0)}
          cartTotal={cartTotal}
          onAdd={() => addToCart(selectedProduct.id)}
          onRemove={() => removeFromCart(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onCheckout={() => { setSelectedProduct(null); setShowModal(true); }}
        />
      )}

      {showModal && selectedSlotId && selectedSlot && (
        <OrderModal
          items={cartItems}
          slotId={selectedSlotId}
          isDelivery={selectedSlot.isDelivery}
          slotLabel={selectedSlot.dayLabel}
          onClose={() => setShowModal(false)}
          onSuccess={handleOrderSuccess}
        />
      )}

      {cartItems.length > 0 && <div className="h-24" />}

      <footer className="border-t border-border py-8 mt-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="font-serif text-brown font-bold text-lg">BROT.74</p>
          <p className="text-xs text-muted mt-1">Pan artesanal de fermentación natural</p>
          <a
            href="https://instagram.com/brot.74"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-brown mt-2 transition-colors"
          >
            <InstagramIcon className="w-3 h-3" /> @brot.74
          </a>
        </div>
      </footer>
    </div>
  );
}
