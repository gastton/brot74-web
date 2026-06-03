"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ShoppingBag, ChevronRight, ChevronLeft, ChevronDown } from "lucide-react";
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
  deliveryMode: "pickup" | "delivery" | "both";
  pickupTime: string;
  location: string;
  imageUrl: string;
  imageFocalX: number;
  imageFocalY: number;
  orderCutoff: string | null;
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
  const [view, setView] = useState<"date" | "menu">("date");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartMap>({});
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);

  const orderingSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch("/api/delivery-slots")
      .then((r) => r.json())
      .then((data) => setSlots(data))
      .finally(() => setLoadingSlots(false));
  }, []);

  // Show header once user scrolls past hero
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderVisible(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    const hero = document.getElementById("hero-section");
    if (hero) observer.observe(hero);
    return () => observer.disconnect();
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

  function scrollToOrdering() {
    orderingSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen">

      {/* Sticky header — aparece al scrollear */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-cream/95 backdrop-blur border-b border-border transition-all duration-300 ${
          headerVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="BROT.74" width={40} height={40} className="object-contain" priority />
            <p className="text-sm font-medium text-muted leading-none">Pan Natural</p>
          </div>
          <a href="https://instagram.com/brot.74" target="_blank" rel="noopener noreferrer"
            className="p-2 text-muted hover:text-brown transition-colors">
            <InstagramIcon className="w-5 h-5" />
          </a>
        </div>
      </header>

      {/* Hero section — pantalla completa */}
      <section
        id="hero-section"
        className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-cream"
      >
        <div className="flex flex-col items-center gap-6">
          <Image src="/logo.png" alt="BROT.74" width={120} height={120} className="object-contain" priority />
          <div>
            <p className="text-muted text-base mt-2">Pan artesanal de fermentación natural</p>
          </div>
          <a
            href="https://instagram.com/brot.74"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-brown transition-colors"
          >
            <InstagramIcon className="w-4 h-4" />
            @brot.74
          </a>
        </div>

        {/* Scroll hint */}
        <button
          onClick={scrollToOrdering}
          className="absolute bottom-8 flex flex-col items-center gap-1 text-muted hover:text-brown transition-colors animate-bounce"
        >
          <span className="text-xs font-medium tracking-widest uppercase">Pedidos</span>
          <ChevronDown className="w-5 h-5" />
        </button>
      </section>

      {/* Ordering section */}
      <section ref={orderingSectionRef} className="min-h-dvh bg-cream">
        <main className="max-w-2xl mx-auto px-4 py-8">
          {view === "date" ? (
            <div className="space-y-5">
              <section className="text-center pt-1">
                <h2 className="font-serif text-4xl sm:text-5xl font-bold text-brown leading-tight">
                  Elegí tu BROT
                </h2>
                <p className="text-muted max-w-sm mx-auto text-sm leading-relaxed mt-1">
                  Seleccioná el día de entrega para ver el menú disponible
                </p>
              </section>

              <section>
                {loadingSlots ? (
                  <div className="rounded-3xl overflow-hidden border-2 border-border animate-pulse max-w-sm mx-auto">
                    <div className="h-64 bg-gray-200" />
                    <div className="bg-white p-5 space-y-3">
                      <div className="h-10 bg-gray-100 rounded-2xl" />
                      <div className="h-10 bg-gray-100 rounded-2xl" />
                      <div className="h-12 bg-gray-200 rounded-2xl" />
                    </div>
                  </div>
                ) : (
                  <DateSelector
                    slots={slots}
                    selectedId={selectedSlotId}
                    onChange={(id) => {
                      setSelectedSlotId(id);
                      setView("menu");
                    }}
                  />
                )}
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <button
                onClick={() => { setView("date"); setSelectedSlotId(null); setCart({}); }}
                className="flex items-center gap-1.5 text-sm font-medium text-brown hover:text-amber transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {selectedSlot?.dayLabel ?? "Cambiar fecha"}
              </button>

              <section>
                <h3 className="font-serif text-xl font-bold text-brown mb-4">Elegí tu pan</h3>
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
            </div>
          )}
        </main>

        <footer className="border-t border-border py-6 mt-8">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <p className="text-xs text-muted">Pan artesanal de fermentación natural</p>
          </div>
        </footer>
      </section>

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
          deliveryMode={selectedSlot.deliveryMode}
          slotLabel={selectedSlot.dayLabel}
          onClose={() => setShowModal(false)}
          onSuccess={handleOrderSuccess}
        />
      )}

      {cartItems.length > 0 && <div className="h-24" />}
    </div>
  );
}
