"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import OrderModal from "@/components/OrderModal";
import CartBar from "@/components/CartBar";
import DateSelector from "@/components/DateSelector";
import HomeHero from "@/components/home/HomeHero";
import HomeStory from "@/components/home/HomeStory";
import HomeIngredients from "@/components/home/HomeIngredients";
import HomeShowcase from "@/components/home/HomeShowcase";
import HomeFooter from "@/components/home/HomeFooter";

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

// BRT-95: cada paso navegable del flujo se refleja en la URL vía query
// params — la URL manda, el estado de "en qué paso estoy" se deriva de ella
// (no vive en un useState propio) para que "atrás" del navegador retroceda
// un paso real en vez de tirar al home. Lo que NO viaja en la URL es estado
// de sesión (carrito, reserva de stock/timer) — eso sigue siendo local,
// ver el spike en BRT-94.
function buildFlowUrl(params: { step?: "slots"; slot?: number | null; product?: number | null; checkout?: "form" | "payment" }): string {
  const sp = new URLSearchParams();
  if (params.slot) sp.set("slot", String(params.slot));
  if (params.step) sp.set("step", params.step);
  if (params.product) sp.set("product", String(params.product));
  if (params.checkout) sp.set("checkout", params.checkout);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const slotParam     = searchParams.get("slot");
  const stepParam     = searchParams.get("step");
  const productParam  = searchParams.get("product");
  const checkoutParam = searchParams.get("checkout"); // "form" | "payment" | null

  const selectedSlotId = slotParam ? Number(slotParam) : null;
  const view: "home" | "slots" | "menu" = selectedSlotId ? "menu" : stepParam === "slots" ? "slots" : "home";
  const isCheckoutOpen = checkoutParam === "form" || checkoutParam === "payment";

  const [slots, setSlots]                     = useState<Slot[]>([]);
  const [products, setProducts]               = useState<Product[]>([]);
  const [cart, setCart]                       = useState<CartMap>({});
  const [loadingSlots, setLoadingSlots]       = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [reserving, setReserving]             = useState(false);
  const [reserveError, setReserveError]       = useState("");
  const [sessionToken, setSessionToken]       = useState("");
  const [reservationExpiresAt, setReservationExpiresAt] = useState("");
  const cartRestoredRef = useRef(false);
  // Marca si el modal de producto abierto ACTUALMENTE fue empujado por
  // nosotros en esta sesión (vs. llegado por link directo/refresh) — decide
  // si el botón de cerrar puede hacer router.back() o necesita replace.
  const productPushedRef = useRef(false);
  const wasCheckoutOpenRef = useRef(false);

  const selectedProductId = productParam ? Number(productParam) : null;
  const selectedProduct = selectedProductId != null
    ? products.find((p) => p.id === selectedProductId) ?? null
    : null;

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

  // Restore cart from localStorage once slots finish loading — solo si la
  // URL no trae ya un slot propio (BRT-95: la URL manda, un link directo/
  // refresh a un paso puntual no debe ser pisado por el carrito guardado).
  // Sigue siendo "una sola vez" (cartRestoredRef), aunque la URL cambie
  // después por otras navegaciones.
  useEffect(() => {
    if (loadingSlots || cartRestoredRef.current) return;
    cartRestoredRef.current = true;
    if (slotParam) return;
    const saved = localStorage.getItem("brot74-cart");
    if (!saved) return;
    try {
      const { slotId, cart: savedCart } = JSON.parse(saved);
      if (!slotId || !savedCart || Object.keys(savedCart).length === 0) return;
      const slot = slots.find((s) => s.id === slotId && !s.disabled);
      if (slot) {
        setCart(savedCart);
        router.replace(buildFlowUrl({ slot: slotId }));
      } else {
        localStorage.removeItem("brot74-cart");
      }
    } catch {
      localStorage.removeItem("brot74-cart");
    }
  }, [loadingSlots, slots, slotParam, router]);

  // Red de seguridad (BRT-95): si la URL apunta a un paso de checkout pero
  // no hay sessionToken local (recarga de página, o "atrás" reabriendo una
  // entrada de historial de un checkout ya cerrado/liberado), no existe
  // ninguna reserva viva que mostrar — se vuelve al menú en silencio, igual
  // que el caso ya existente de reserva vencida (no se puede "reconstruir"
  // un pago sin una reserva de stock real detrás).
  useEffect(() => {
    if (isCheckoutOpen && !sessionToken && selectedSlotId) {
      router.replace(buildFlowUrl({ slot: selectedSlotId }));
    }
  }, [isCheckoutOpen, sessionToken, selectedSlotId, router]);

  // Cuando el checkout deja de estar abierto (por cualquier vía: botón de
  // cerrar, "atrás" del navegador, o la red de seguridad de arriba) se
  // libera la reserva de stock y se refresca la grilla — antes vivía todo
  // junto en handleModalClose, ahora se centraliza acá para cubrir también
  // el cierre por navegación de historial, que no pasa por ningún handler.
  useEffect(() => {
    if (wasCheckoutOpenRef.current && !isCheckoutOpen) {
      if (sessionToken) {
        fetch("/api/cart/release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken }),
        }).catch(() => {});
      }
      setSessionToken("");
      setReservationExpiresAt("");
      if (selectedSlotId) fetchProducts(selectedSlotId);
    }
    wasCheckoutOpenRef.current = isCheckoutOpen;
  }, [isCheckoutOpen, sessionToken, selectedSlotId, fetchProducts]);

  // Persist cart to localStorage on every change
  useEffect(() => {
    if (selectedSlotId && Object.keys(cart).length > 0) {
      localStorage.setItem("brot74-cart", JSON.stringify({ slotId: selectedSlotId, cart }));
    } else if (selectedSlotId) {
      localStorage.removeItem("brot74-cart");
    }
  }, [cart, selectedSlotId]);

  function selectSlot(id: number) {
    setCart({});
    router.push(buildFlowUrl({ slot: id }));
  }

  function openProduct(product: Product) {
    if (!selectedSlotId) return;
    productPushedRef.current = true;
    router.push(buildFlowUrl({ slot: selectedSlotId, product: product.id }));
  }

  // Cierra el modal de producto retrocediendo un paso de historial si fue
  // este mismo cliente quien lo empujó (deja el historial limpio); si se
  // llegó por link directo/refresh no hay nada propio que "deshacer", así
  // que se reemplaza sin agregar entrada.
  function closeProduct() {
    if (!selectedSlotId) return;
    if (productPushedRef.current) {
      productPushedRef.current = false;
      router.back();
    } else {
      router.replace(buildFlowUrl({ slot: selectedSlotId }));
    }
  }

  function addToCart(productId: number) {
    setCart((prev) => {
      const current = prev[productId] ?? 0;
      const product = products.find((p) => p.id === productId);
      // Tope defensivo (BRT-117): el "+" de la card ya se deshabilita al
      // llegar al stock disponible, pero clicks disparados a mansalva
      // pueden encolarse antes de que React vuelva a renderizar el botón
      // deshabilitado. El updater funcional ve siempre el último `prev`,
      // así que este chequeo alcanza incluso en ese caso.
      if (product && product.stock !== null && current >= product.stock) return prev;
      return { ...prev, [productId]: current + 1 };
    });
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
      router.push(buildFlowUrl({ slot: selectedSlotId, checkout: "form" }));
    } catch {
      setReserveError("Error de conexión. Intentá de nuevo.");
    } finally {
      setReserving(false);
    }
  }

  // BRT-95: pasar de "Tu pedido" a "Pagá por transferencia" ahora es un paso
  // propio en la URL (antes era un setState interno de OrderModal) — así
  // "atrás" desde la pantalla de pago vuelve al form, no cierra todo.
  function advanceToPaymentStep() {
    if (!selectedSlotId) return;
    router.push(buildFlowUrl({ slot: selectedSlotId, checkout: "payment" }));
  }

  // Cierra el checkout. La liberación de la reserva y el refresco de stock
  // viven en el efecto de arriba (cubre también el cierre por "atrás" del
  // navegador); acá solo se decide la navegación y, si corresponde, se
  // vacía el carrito (BRT-88: reserva vencida o cierre confirmado).
  //
  // A diferencia del modal de producto, acá SIEMPRE se retrocede el número
  // exacto de pasos que nosotros empujamos (1 si solo se abrió "form", 2 si
  // se llegó a "payment") en vez de un solo back() — el botón de cerrar
  // representa "salir del checkout entero", no "un paso atrás dentro de
  // él". Si no hay nada propio que retroceder (link directo/refresh — la
  // red de seguridad ya nos habría mandado al menú antes de poder cerrar)
  // se reemplaza directo.
  function closeCheckout(clearCart?: boolean) {
    if (clearCart) {
      setCart({});
      localStorage.removeItem("brot74-cart");
    }
    if (!selectedSlotId) return;
    const depth = checkoutParam === "payment" ? 2 : checkoutParam === "form" ? 1 : 0;
    if (depth > 0 && sessionToken) {
      window.history.go(-depth);
    } else {
      router.replace(buildFlowUrl({ slot: selectedSlotId }));
    }
  }

  function handleOrderSuccess(orderId: number) {
    // No navegamos fuera del checkout acá (BRT-89): es una navegación dura
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
              onClick={() => router.push(buildFlowUrl({ step: "slots" }))}
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
                  onClick={() => openProduct(product)}
                  onQuickAdd={() => addToCart(product.id)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Cart bar — única (BRT-89): visible en la grilla. Se oculta con
           ProductModal abierto (mobile y desktop por igual — ahí la
           referencia tampoco la muestra, es una pantalla acotada de elegir
           cantidad y confirmar) y durante el checkout. */}
        {cartItems.length > 0 && selectedSlotId && !isCheckoutOpen && !selectedProduct && (
          <CartBar
            count={cartItems.reduce((s, i) => s + i.quantity, 0)}
            total={cartTotal}
            reserving={reserving}
            error={reserveError}
            onCheckout={() => openCheckout()}
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
            onClose={closeProduct}
            onCheckout={() => openCheckout()}
          />
        )}

        {isCheckoutOpen && selectedSlotId && selectedSlot && sessionToken && reservationExpiresAt && (
          <OrderModal
            items={cartItems}
            slotId={selectedSlotId}
            slotLabel={selectedSlot.dayLabel}
            step={checkoutParam === "payment" ? "payment" : "form"}
            sessionToken={sessionToken}
            expiresAt={reservationExpiresAt}
            onRemoveItem={removeItemFromCart}
            onChangeQuantity={changeCartQuantity}
            onAdvanceToPayment={advanceToPaymentStep}
            onClose={closeCheckout}
            onSuccess={handleOrderSuccess}
          />
        )}

        {cartItems.length > 0 && <div className="h-24" />}
      </div>
    );
  }

  /* ─── HOME VIEW ──────────────────────────────────────────── */
  // BRT-130: stack de secciones apilables. Las secciones de BRT-134 y
  // BRT-135 (cómo funciona, pedidos) se agregan acá en el medio, cada
  // una como su propio componente en components/home/.
  return (
    <div className="min-h-screen" style={{ background: "#0E233C" }}>
      <HomeHero onReservar={() => router.push(buildFlowUrl({ step: "slots" }))} />
      <HomeStory />
      <HomeIngredients />
      <HomeShowcase />
      <HomeFooter />
    </div>
  );
}

// useSearchParams() exige un límite Suspense (BRT-95) — mismo patrón que ya
// usa app/confirmacion/page.tsx.
export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
