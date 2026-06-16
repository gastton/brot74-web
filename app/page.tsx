"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import OrderModal from "@/components/OrderModal";
import DateSelector from "@/components/DateSelector";
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

const serif = "var(--font-newsreader, 'Newsreader', Georgia, serif)";
const ctaTransition = "transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s";


export default function Home() {
  const [slots, setSlots]                     = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId]   = useState<number | null>(null);
  const [view, setView]                       = useState<"home" | "slots" | "menu">("home");
  const [products, setProducts]               = useState<Product[]>([]);
  const [cart, setCart]                       = useState<CartMap>({});
  const [showModal, setShowModal]             = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingSlots, setLoadingSlots]       = useState(true);
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
    }
  }, [selectedSlotId, fetchProducts]);

  function selectSlot(id: number) {
    setSelectedSlotId(id);
    setView("menu");
  }

  function goHome() {
    setView("home");
    setSelectedSlotId(null);
    setCart({});
  }

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

  const cartTotal    = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  function handleOrderSuccess(orderId: number) {
    setShowModal(false);
    window.location.href = `/confirmacion?order=${orderId}&status=pending`;
  }

  /* ─── SLOTS VIEW ────────────────────────────────────────── */
  if (view === "slots") {
    return (
      <div className="min-h-screen" style={{ background: "#F4EEE2" }}>
        <main className="w-full max-w-[430px] mx-auto px-6 py-10">
          <DateSelector
            slots={slots}
            selectedId={selectedSlotId}
            onChange={(id) => selectSlot(id)}
          />

          <p
            className="text-center font-medium text-[14px] leading-[1.6]"
            style={{ color: "#7C766A", marginTop: "22px", maxWidth: "34ch", marginInline: "auto" }}
          >
            Acá vas a ver el próximo día de entrega disponible: horario, lugar y hasta cuándo podés pedir. Cuando estés listo, tocá VER MENÚ para elegir tu pan.
          </p>
        </main>
      </div>
    );
  }

  /* ─── MENU VIEW ─────────────────────────────────────────── */
  if (view === "menu") {
    return (
      <div className="min-h-screen bg-cream">
        <main className="w-full max-w-[430px] mx-auto px-4 py-8">
          <div className="space-y-[22px]">
            {/* Volver */}
            <button
              onClick={() => setView("slots")}
              className="inline-flex items-center gap-[6px] font-semibold text-[14.5px] text-navy hover:text-amber transition-colors"
              style={{ opacity: 0.85 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5l-7 7 7 7"/>
              </svg>
              {selectedSlot?.dayLabel ?? "Cambiar fecha"}
            </button>

            <h2 className="font-bold text-[30px] tracking-[-0.01em] text-navy" style={{ margin: "18px 0 22px" }}>
              Elegí tu <em className="not-italic" style={{ color: "#C8851A" }}>pan</em>
            </h2>

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
        </main>

        {/* Cart bar */}
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
                  transition: ctaTransition,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
              >
                <span className="w-9 h-9 flex-none rounded-full flex items-center justify-center" style={{ border: "1px solid rgba(244,238,226,.38)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4EEE2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>
                  </svg>
                </span>
                <span className="font-semibold text-[16px] whitespace-nowrap">
                  {cartItems.reduce((s, i) => s + i.quantity, 0)} producto{cartItems.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
                </span>
                <span className="font-bold text-[18px] ml-auto whitespace-nowrap">{formatCurrency(cartTotal)}</span>
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

  /* ─── HOME VIEW ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: "#F4EEE2" }}>
      <div className="w-full max-w-[430px] mx-auto">

        {/* ── Hero (banda navy) ── */}
        <section
          className="flex flex-col items-center text-center"
          style={{ background: "#0E233C", minHeight: "100svh", padding: "56px 32px 80px", position: "relative", justifyContent: "center" }}
        >
          {/* Sello medallón */}
          <div
            style={{
              position: "relative",
              width: "212px",
              height: "212px",
              borderRadius: "50%",
              background: "#F4EEE2",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingBottom: "18px",
              filter: "drop-shadow(0 20px 36px rgba(0,0,0,.35))",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "10px",
                borderRadius: "50%",
                border: "1px solid rgba(14,35,60,.16)",
                pointerEvents: "none",
              }}
            />
            <Image
              src="/ramillete-ink-b.png"
              alt="Ramillete BROT 74"
              width={129}
              height={129}
              className="object-contain"
              style={{ height: "129px", width: "auto" }}
              priority
            />
            <div style={{ display: "inline-flex", alignItems: "baseline", marginTop: "3px", lineHeight: 1, fontSize: "21px" }}>
              <span style={{ fontWeight: 500, letterSpacing: "0.04em", color: "#0E233C" }}>BROT</span>
              <span style={{ fontWeight: 700, letterSpacing: "0.04em", marginLeft: "3px", color: "#E49C24" }}>74</span>
            </div>
          </div>

          {/* Kicker */}
          <p
            className="font-semibold uppercase tracking-[.3em]"
            style={{ fontSize: "11px", color: "rgba(244,238,226,.62)", marginTop: "30px" }}
          >
            Micro-panadería de masa madre
          </p>

          {/* Título */}
          <h1
            style={{
              fontFamily: serif,
              fontWeight: 400,
              fontSize: "41px",
              lineHeight: 1.08,
              letterSpacing: "-.015em",
              color: "#F4EEE2",
              margin: "16px 0 0",
              maxWidth: "13ch",
            }}
          >
            Pan de fermentación natural,{" "}
            <em style={{ fontStyle: "italic", color: "#EBB155" }}>como debe ser.</em>
          </h1>

          {/* CTA */}
          <button
            onClick={() => setView("slots")}
            className="inline-flex items-center gap-[11px] font-bold border-none cursor-pointer"
            style={{
              marginTop: "30px",
              fontSize: "15.5px",
              letterSpacing: ".02em",
              color: "#0E233C",
              background: "#E49C24",
              padding: "16px 28px",
              borderRadius: "12px",
              boxShadow: "0 16px 32px -14px rgba(228,156,36,.6)",
              transition: ctaTransition,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              const arrow = e.currentTarget.querySelector<HTMLElement>(".arrow");
              if (arrow) arrow.style.transform = "translateX(4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              const arrow = e.currentTarget.querySelector<HTMLElement>(".arrow");
              if (arrow) arrow.style.transform = "";
            }}
          >
            Pedí tu BROT{" "}
            <span className="arrow" style={{ fontSize: "17px", display: "inline-block", transition: "transform .2s cubic-bezier(.2,.7,.3,1)" }}>→</span>
          </button>

          {/* Tagline (anclado al pie del hero) */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: "30px",
              textAlign: "center",
              fontWeight: 600,
              fontSize: "10.5px",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "rgba(244,238,226,.42)",
            }}
          >
            Pan hecho con tiempo
          </div>
        </section>

      </div>
    </div>
  );
}
