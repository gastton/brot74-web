"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import OrderModal from "@/components/OrderModal";
import CartBar from "@/components/CartBar";
import DateSelector from "@/components/DateSelector";

interface Slot {
  id: number | null;
  date: string;
  dayLabel: string;
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

const serif = "var(--font-hanken, 'Hanken Grotesk', system-ui, sans-serif)";

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
  const [reserving, setReserving]             = useState(false);
  const [reserveError, setReserveError]       = useState("");
  const [sessionToken, setSessionToken]       = useState("");
  const [reservationExpiresAt, setReservationExpiresAt] = useState("");
  const cartRestoredRef = useRef(false);

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
    }
  }, [selectedSlotId, fetchProducts]);

  // Restore cart from localStorage once slots finish loading
  useEffect(() => {
    if (loadingSlots || cartRestoredRef.current) return;
    cartRestoredRef.current = true;
    const saved = localStorage.getItem("brot74-cart");
    if (!saved) return;
    try {
      const { slotId, cart: savedCart } = JSON.parse(saved);
      if (!slotId || !savedCart || Object.keys(savedCart).length === 0) return;
      const slot = slots.find((s) => s.id === slotId && !s.disabled);
      if (slot) {
        setSelectedSlotId(slotId);
        setCart(savedCart);
        setView("menu");
      } else {
        localStorage.removeItem("brot74-cart");
      }
    } catch {
      localStorage.removeItem("brot74-cart");
    }
  }, [loadingSlots, slots]);

  // Persist cart to localStorage on every change
  useEffect(() => {
    if (selectedSlotId && Object.keys(cart).length > 0) {
      localStorage.setItem("brot74-cart", JSON.stringify({ slotId: selectedSlotId, cart }));
    } else if (selectedSlotId) {
      localStorage.removeItem("brot74-cart");
    }
  }, [cart, selectedSlotId]);

  function selectSlot(id: number) {
    setSelectedSlotId(id);
    setView("menu");
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

  function removeItemFromCart(productId: number) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  function changeCartQuantity(productId: number, newQuantity: number) {
    if (newQuantity <= 0) {
      removeItemFromCart(productId);
    } else {
      setCart((prev) => ({ ...prev, [productId]: newQuantity }));
    }
  }

  const cartItems = products
    .filter((p) => (cart[p.id] ?? 0) > 0)
    .map((p) => ({ id: p.id, name: p.name, price: p.price, quantity: cart[p.id], stock: p.stock }));

  const cartTotal    = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  async function openCheckout() {
    if (!selectedSlotId || cartItems.length === 0) return;
    setReserveError("");
    setReserving(true);
    try {
      const res = await fetch("/api/cart/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlotId,
          items: cartItems.map((i) => ({ productId: i.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReserveError(data.error ?? "No se pudo reservar. Intentá de nuevo.");
        // Refresh products to show updated stock
        fetchProducts(selectedSlotId);
        return;
      }
      setSessionToken(data.sessionToken);
      setReservationExpiresAt(data.expiresAt);
      setShowModal(true);
    } catch {
      setReserveError("Error de conexión. Intentá de nuevo.");
    } finally {
      setReserving(false);
    }
  }

  function handleModalClose(clearCart?: boolean) {
    if (sessionToken) {
      fetch("/api/cart/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      }).catch(() => {});
    }
    setShowModal(false);
    setSessionToken("");
    setReservationExpiresAt("");
    if (clearCart) {
      // Reserva vencida o cierre confirmado por el usuario (BRT-88): no
      // dejamos el carrito con productos "elegidos" sobre una reserva que
      // ya no existe — se vuelve a armar de cero.
      setCart({});
      localStorage.removeItem("brot74-cart");
    }
    if (selectedSlotId) fetchProducts(selectedSlotId);
  }

  function handleOrderSuccess(orderId: number) {
    // No hacemos setShowModal(false) acá (BRT-89): es una navegación dura
    // vía window.location.href, no instantánea — cerrar el modal antes de
    // que el navegador termine de irse dejaba ver un flash de la grilla de
    // productos de atrás. Dejamos el modal montado hasta que la página
    // completa se reemplace sola.
    localStorage.removeItem("brot74-cart");
    window.location.href = `/confirmacion?order=${orderId}&status=pending`;
  }

  /* ─── SLOTS VIEW ────────────────────────────────────────── */
  if (view === "slots") {
    return (
      <div className="min-h-screen" style={{ background: "#F9F5EC" }}>
        <main className="w-full max-w-[430px] min-[900px]:max-w-[780px] mx-auto px-6 py-10">
          {/* Título */}
          <header className="mb-5 text-center">
            <h2 className="font-bold text-[37px] leading-[1.05] tracking-[-0.01em] text-navy m-0">
              Tu próximo <em className="not-italic" style={{ color: "#C8851A" }}>BROT</em>
            </h2>
          </header>

          {loadingSlots ? (
            <div className="flex justify-center items-center py-20">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "3px solid rgba(14,35,60,.12)",
                  borderTopColor: "#0E233C",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <DateSelector
              slots={slots}
              selectedId={selectedSlotId}
              onChange={(id) => selectSlot(id)}
            />
          )}
        </main>
      </div>
    );
  }

  /* ─── MENU VIEW ─────────────────────────────────────────── */
  if (view === "menu") {
    return (
      <div className="min-h-screen bg-cream">
        <main className="w-full max-w-[430px] md:max-w-none lg:max-w-[1120px] mx-auto px-4 py-8 md:px-10 md:pt-9 md:pb-14 lg:px-12 lg:pt-12 lg:pb-[72px]">
          {/* Cabecera: columna en mobile, fila en tablet+ */}
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3 md:gap-6 mb-[22px] md:mb-[28px]">
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

            <h2 className="font-bold text-[30px] tracking-[-0.01em] text-navy m-0">
              Elegí tu <em className="not-italic" style={{ color: "#C8851A" }}>BROT</em>
            </h2>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-[22px] lg:gap-[26px]">
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-[22px] lg:gap-[26px]">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  quantity={cart[product.id] ?? 0}
                  slotSelected={!!selectedSlotId}
                  onClick={() => setSelectedProduct(product)}
                  onQuickAdd={() => addToCart(product.id)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Cart bar — única (BRT-89): visible en la grilla. Se oculta con
           ProductModal abierto (mobile y desktop por igual — ahí la
           referencia tampoco la muestra, es una pantalla acotada de elegir
           cantidad y confirmar) y durante el checkout (showModal). */}
        {cartItems.length > 0 && selectedSlotId && !showModal && !selectedProduct && (
          <CartBar
            count={cartItems.reduce((s, i) => s + i.quantity, 0)}
            total={cartTotal}
            reserving={reserving}
            error={reserveError}
            onCheckout={() => { setSelectedProduct(null); openCheckout(); }}
          />
        )}

        {selectedProduct && (
          <ProductModal
            key={selectedProduct.id}
            product={selectedProduct}
            quantity={cart[selectedProduct.id] ?? 0}
            slotSelected={!!selectedSlotId}
            cartCount={cartItems.reduce((s, i) => s + i.quantity, 0)}
            cartTotal={cartTotal}
            onAdd={() => addToCart(selectedProduct.id)}
            onRemove={() => removeFromCart(selectedProduct.id)}
            onConfirmQuantity={(qty) => changeCartQuantity(selectedProduct.id, qty)}
            onClose={() => setSelectedProduct(null)}
            onCheckout={() => { setSelectedProduct(null); openCheckout(); }}
          />
        )}

        {showModal && selectedSlotId && selectedSlot && sessionToken && reservationExpiresAt && (
          <OrderModal
            items={cartItems}
            slotId={selectedSlotId}
            slotLabel={selectedSlot.dayLabel}
            sessionToken={sessionToken}
            expiresAt={reservationExpiresAt}
            onRemoveItem={removeItemFromCart}
            onChangeQuantity={changeCartQuantity}
            onClose={handleModalClose}
            onSuccess={handleOrderSuccess}
          />
        )}

        {cartItems.length > 0 && <div className="h-24" />}
      </div>
    );
  }

  /* ─── HOME VIEW ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: "#0E233C" }}>

        {/* ── Hero (v30: banda crema, antes navy) ── */}
        <section
          className="brot-hero-section flex flex-col items-center text-center"
          style={{
            background: "radial-gradient(120% 60% at 50% 22%, rgba(200,133,26,.10), rgba(14,35,60,0) 60%), #F9F5EC",
            minHeight: "100svh",
            padding: "64px 40px 40px",
            position: "relative",
            justifyContent: "center",
          }}
        >
          {/* Grano sutil — le da algo de textura "hecho a mano" al fondo
             crema, que si no queda un poco plano/corporativo. Puramente
             CSS (SVG inline), no suma ningún asset nuevo. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              opacity: 0.035,
              mixBlendMode: "multiply",
              pointerEvents: "none",
            }}
          />

          {/* Sello — v30: ramillete navy sobre crema (antes crema sobre navy) */}
          <div
            className="brot-hero-seal-wrap"
            style={{
              position: "relative",
              width: "230px",
              height: "230px",
              fontSize: "230px",
              flexShrink: 0,
              filter: "drop-shadow(0 20px 36px rgba(0,0,0,.35))",
            }}
          >
            <svg
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <circle cx="50" cy="50" r="48" fill="none" stroke="#0E233C" strokeWidth="1" opacity="0.95" />
              <circle cx="50" cy="50" r="43.6" fill="none" stroke="#0E233C" strokeWidth="0.5" opacity="0.6" />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                paddingBottom: ".05em",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ramillete-mono-navy.png" alt="" style={{ height: ".56em", width: "auto", display: "block" }} />
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  lineHeight: 1,
                  marginTop: ".01em",
                  fontFamily: "var(--font-jost, 'Jost', sans-serif)",
                }}
              >
                <span style={{ fontWeight: 500, fontSize: ".115em", color: "#0E233C" }}>BROT</span>
                <span style={{ fontWeight: 700, fontSize: ".115em", letterSpacing: "-.2em", marginLeft: ".18em", color: "#C8851A" }}>74</span>
              </div>
            </div>
          </div>

          {/* Kicker */}
          <p className="brot-hero-kicker" style={{ marginTop: "48px" }}>
            Micropanadería de masa madre
          </p>

          {/* Título */}
          <h1
            className="brot-hero-h1"
            style={{
              fontFamily: serif,
              fontWeight: 800,
              fontSize: "clamp(40px, 7.5vw, 60px)",
              lineHeight: 1.08,
              letterSpacing: "-.015em",
              color: "#0E233C",
              margin: "26px 0 0",
              maxWidth: "13ch",
              textWrap: "balance" as React.CSSProperties["textWrap"],
            }}
          >
            Pan de fermentación natural,{" "}
            <em style={{ fontStyle: "normal", color: "#C8851A" }}>como debe ser.</em>
          </h1>

          {/* CTA */}
          <button
            onClick={() => setView("slots")}
            className="brot-hero-cta inline-flex items-center gap-[11px] font-bold border-none cursor-pointer"
            style={{
              marginTop: "44px",
              fontSize: "16px",
              letterSpacing: ".01em",
              color: "#0E233C",
              background: "#C8851A",
              padding: "18px 30px",
              borderRadius: "12px",
              boxShadow: "0 16px 34px -14px rgba(200,133,26,.7)",
              transition: ctaTransition,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.background = "#E0A33A";
              e.currentTarget.style.boxShadow = "0 20px 40px -14px rgba(200,133,26,.85)";
              const arrow = e.currentTarget.querySelector(".arrow") as HTMLElement | null;
              if (arrow) arrow.style.transform = "translateX(4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.background = "#C8851A";
              e.currentTarget.style.boxShadow = "0 16px 34px -14px rgba(200,133,26,.7)";
              const arrow = e.currentTarget.querySelector(".arrow") as HTMLElement | null;
              if (arrow) arrow.style.transform = "";
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(.97)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onTouchStart={(e) => { e.currentTarget.style.transform = "scale(.97)"; }}
            onTouchEnd={(e) => { e.currentTarget.style.transform = ""; }}
          >
            Reservá tu BROT{" "}
            <span className="arrow" style={{ fontSize: "17px", display: "inline-block", transition: "transform .2s cubic-bezier(.2,.7,.3,1)" }}>{"→"}</span>
          </button>

        </section>

        {/* Footer: crédito de desarrollo */}
        <footer
          style={{
            background: "#0E233C",
            borderTop: "1px solid rgba(249,245,236,.08)",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: "10.5px",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "rgba(249,245,236,.42)",
            }}
          >
            Powered by
          </span>
          <a href="https://luontek.com/" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/luontek-horizontal-oscuro.svg"
              alt="Luontek"
              style={{ height: "18px", width: "auto", display: "block" }}
            />
          </a>
        </footer>

    </div>
  );
}
