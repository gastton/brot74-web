"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
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
  imageScale: number;
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
  imageScale: number;
  stock: number | null;
  hasStock: boolean;
}

type CartMap = Record<number, number>;

export default function Home() {
  const [slots, setSlots]                   = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [view, setView]                     = useState<"date" | "menu">("date");
  const [products, setProducts]             = useState<Product[]>([]);
  const [cart, setCart]                     = useState<CartMap>({});
  const [showModal, setShowModal]           = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingSlots, setLoadingSlots]     = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const orderingSectionRef = useRef<HTMLElement>(null);

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
      fetch("/api/products").then((r) => r.json()).then(setProducts);
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

  const cartTotal   = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  function handleOrderSuccess(orderId: number) {
    setShowModal(false);
    window.location.href = `/confirmacion?order=${orderId}&status=pending`;
  }

  function scrollToOrdering() {
    orderingSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Hero section ── */}
      <section className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-cream">
        <div className="flex flex-col items-center gap-5">
          <Image src="/logo.png" alt="BROT.74" width={110} height={110} className="object-contain" priority />
          <div>
            <p className="text-stone text-[15px] mt-2" style={{ fontFamily: "var(--font-newsreader, 'Newsreader', Georgia, serif)", fontStyle: "italic" }}>
              Pan artesanal de fermentación natural
            </p>
          </div>
          <a
            href="https://instagram.com/brot.74"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-stone hover:text-amber transition-colors"
          >
            <InstagramIcon className="w-4 h-4" />
            @brot.74
          </a>
        </div>

        <button
          onClick={scrollToOrdering}
          className="absolute bottom-8 flex flex-col items-center gap-1 text-amber hover:text-navy transition-colors"
          style={{ animation: "bounce 1s infinite" }}
        >
          <span className="text-xs font-bold tracking-widest uppercase">Pedidos</span>
          <ChevronDown className="w-5 h-5" />
        </button>
      </section>

      {/* ── Ordering section ── */}
      <section ref={orderingSectionRef} className="min-h-dvh bg-cream">
        <main className="w-full max-w-[430px] mx-auto px-4 py-8">

          {view === "date" ? (
            /* ── Vista: selección de fecha ── */
            <div className="space-y-6">
              <header className="text-center pt-1">
                <h2
                  className="font-bold text-[37px] leading-[1.05] tracking-[-0.01em] text-navy m-0"
                >
                  Elegí tu <em className="not-italic" style={{ color: "#C8851A" }}>BROT</em>
                </h2>
                <p
                  className="text-[15.5px] leading-[1.45] text-stone mt-3 mx-auto"
                  style={{
                    fontFamily: "var(--font-newsreader, 'Newsreader', Georgia, serif)",
                    fontStyle: "italic",
                    maxWidth: "26ch",
                  }}
                >
                  Seleccioná el día de entrega para ver el menú disponible
                </p>
              </header>

              {loadingSlots ? (
                <div
                  className="rounded-[22px] overflow-hidden animate-pulse"
                  style={{ background: "#FBF7EF", border: "1px solid rgba(14,35,60,.10)" }}
                >
                  <div className="h-[290px] bg-stone/20" />
                  <div className="p-6 space-y-4">
                    <div className="h-10 rounded-[12px] bg-stone/10" />
                    <div className="h-10 rounded-[12px] bg-stone/10" />
                    <div className="h-14 rounded-[14px] bg-stone/20" />
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
            </div>
          ) : (
            /* ── Vista: menú del día ── */
            <div className="space-y-[22px]">
              {/* Volver */}
              <button
                onClick={() => { setView("date"); setSelectedSlotId(null); setCart({}); }}
                className="inline-flex items-center gap-[6px] font-semibold text-[14.5px] text-navy hover:text-amber transition-colors"
                style={{ opacity: 0.85 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5l-7 7 7 7"/>
                </svg>
                {selectedSlot?.dayLabel ?? "Cambiar fecha"}
              </button>

              {/* Título */}
              <h2
                className="font-bold text-[30px] tracking-[-0.01em] text-navy m-0"
              >
                Elegí tu <em className="not-italic" style={{ color: "#C8851A" }}>pan</em>
              </h2>

              {/* Grilla de productos */}
              {loadingProducts ? (
                <div className="grid grid-cols-2 gap-[18px]">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-square rounded-[16px] bg-stone/20" />
                      <div className="pt-3 space-y-2">
                        <div className="h-4 rounded bg-stone/10" />
                        <div className="h-3 rounded bg-stone/10 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-[18px]">
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
            </div>
          )}
        </main>

        <footer className="py-6 mt-8">
          <div className="max-w-[430px] mx-auto px-4 text-center">
            <p className="text-[13px] text-stone" style={{ fontFamily: "var(--font-newsreader, 'Newsreader', Georgia, serif)", fontStyle: "italic" }}>
              Pan artesanal de fermentación natural
            </p>
          </div>
        </footer>
      </section>

      {/* ── Barra de carrito fija ── */}
      {cartItems.length > 0 && selectedSlotId && !selectedProduct && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4" style={{ background: "linear-gradient(to top, #F4EEE2 60%, transparent)" }}>
          <div className="max-w-[430px] mx-auto">
            <button
              onClick={() => setShowModal(true)}
              className="w-full flex items-center gap-3 rounded-[16px] border-none"
              style={{
                background: "#0E233C",
                color: "#F4EEE2",
                padding: "14px 18px",
                cursor: "pointer",
                boxShadow: "0 8px 24px -8px rgba(14,35,60,.5)",
                transition: "transform .18s cubic-bezier(.2,.7,.3,1)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
            >
              <span
                className="w-9 h-9 flex-none rounded-full flex items-center justify-center"
                style={{ border: "1px solid rgba(244,238,226,.38)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4EEE2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>
                </svg>
              </span>
              <span className="font-semibold text-[16px] whitespace-nowrap">
                {cartItems.reduce((s, i) => s + i.quantity, 0)} producto{cartItems.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
              </span>
              <span className="font-bold text-[18px] ml-auto whitespace-nowrap">
                {formatCurrency(cartTotal)}
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4EEE2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6"/>
              </svg>
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
