"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import OrderModal from "@/components/OrderModal";
import CartBar from "@/components/CartBar";
import DateSelector from "@/components/DateSelector";
import HomeLanding from "@/components/home/HomeLanding";
import { MAX_PER_PRODUCT } from "@/lib/cartItems";
import PickupDateRow from "@/components/PickupDateRow";

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
  discountPrice: number | null; // v53: precio con descuento vigente (null = sin descuento)
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

// Persistencia del carrito — envuelta en try/catch porque localStorage puede
// tirar (incógnito estricto, navegador que lo bloquea) en cualquiera de sus
// métodos, no solo al escribir; ante cualquier falla se degrada a "no hay
// carrito guardado" sin romper el flujo (mismo criterio que BRT-182 en
// OrderModal).
const CART_STORAGE_KEY = "brot74-cart";

function readSavedCart(): string | null {
  try {
    return localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSavedCart(value: string) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, value);
  } catch {
    /* localStorage no disponible — no hay nada que persistir */
  }
}

function clearSavedCart() {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    /* localStorage no disponible — no hay nada que limpiar */
  }
}

// BRT-95: cada paso navegable del flujo se refleja en la URL vía query
// params — la URL manda, el estado de "en qué paso estoy" se deriva de ella
// (no vive en un useState propio) para que "atrás" del navegador retroceda
// un paso real en vez de tirar al home. Lo que NO viaja en la URL es estado
// de sesión (carrito, checkout iniciado) — eso sigue siendo local,
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
  // Marca que el checkout se abrió en esta carga de página (vs. llegar por
  // link directo, refresh o "atrás"/"adelante" del navegador). Sin reserva de
  // stock por tiempo ya no hay un token que lo certifique.
  const [checkoutStarted, setCheckoutStarted] = useState(false);
  const cartRestoredRef = useRef(false);
  // Marca si el modal de producto abierto ACTUALMENTE fue empujado por
  // nosotros en esta sesión (vs. llegado por link directo/refresh) — decide
  // si el botón de cerrar puede hacer router.back() o necesita replace.
  const productPushedRef = useRef(false);

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

  // Restore cart from localStorage once slots finish loading. Si la URL ya
  // trae un slot propio (BRT-95: la URL manda, un link directo/refresh a un
  // paso puntual no debe ser pisado por el carrito guardado) solo se repone
  // el contenido del carrito cuando es de ese mismo slot — sin tocar la URL.
  // Sigue siendo "una sola vez" (cartRestoredRef), aunque la URL cambie
  // después por otras navegaciones.
  useEffect(() => {
    if (loadingSlots || cartRestoredRef.current) return;
    cartRestoredRef.current = true;
    const saved = readSavedCart();
    if (!saved) return;
    try {
      const { slotId, cart: savedCart } = JSON.parse(saved);
      if (!slotId || !savedCart || Object.keys(savedCart).length === 0) return;
      const sameSlotInUrl = !!slotParam && Number(slotParam) === slotId;
      if (slotParam && !sameSlotInUrl) return;
      const slot = slots.find((s) => s.id === slotId && !s.disabled);
      if (sameSlotInUrl || slot) {
        // Carritos guardados antes del tope de 3 por pan: se recortan.
        setCart(Object.fromEntries(
          Object.entries(savedCart as CartMap).map(([id, q]) => [id, Math.min(Number(q), MAX_PER_PRODUCT)])
        ));
        if (!sameSlotInUrl) router.replace(buildFlowUrl({ slot: slotId }));
      } else {
        clearSavedCart();
      }
    } catch {
      clearSavedCart();
    }
  }, [loadingSlots, slots, slotParam, router]);

  // Red de seguridad (BRT-95): si la URL apunta a un paso de checkout pero
  // el checkout no se abrió en esta carga de página (recarga, o "atrás"
  // reabriendo una entrada de historial de un checkout ya cerrado) se vuelve
  // al menú en silencio — el carrito guardado se repone solo (ver arriba).
  useEffect(() => {
    if (isCheckoutOpen && !checkoutStarted && selectedSlotId) {
      router.replace(buildFlowUrl({ slot: selectedSlotId }));
    }
  }, [isCheckoutOpen, checkoutStarted, selectedSlotId, router]);

  // Persist cart to localStorage on every change
  useEffect(() => {
    if (selectedSlotId && Object.keys(cart).length > 0) {
      writeSavedCart(JSON.stringify({ slotId: selectedSlotId, cart }));
    } else if (selectedSlotId && cartRestoredRef.current) {
      // Recién después de intentar restaurar: al montar con un slot en la
      // URL el carrito todavía está vacío y no hay que borrar el guardado.
      clearSavedCart();
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
      if (current >= MAX_PER_PRODUCT) return prev;
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
      setCart((prev) => ({ ...prev, [productId]: Math.min(newQuantity, MAX_PER_PRODUCT) }));
    }
  }

  const cartItems = products
    .filter((p) => (cart[p.id] ?? 0) > 0)
    .map((p) => ({ id: p.id, name: p.name, price: p.discountPrice ?? p.price, quantity: cart[p.id], stock: p.stock }));

  const cartTotal    = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  // Sin reserva de stock por tiempo: abrir el checkout es solo navegar. El
  // pedido (y su stock) se crea recién al tocar "Pagar".
  function openCheckout() {
    if (!selectedSlotId || cartItems.length === 0) return;
    setCheckoutStarted(true);
    router.push(buildFlowUrl({ slot: selectedSlotId, checkout: "form" }));
  }

  // BRT-95: pasar de "Tu pedido" a "Pagá por transferencia" ahora es un paso
  // propio en la URL (antes era un setState interno de OrderModal) — así
  // "atrás" desde la pantalla de pago vuelve al form, no cierra todo.
  function advanceToPaymentStep() {
    if (!selectedSlotId) return;
    router.push(buildFlowUrl({ slot: selectedSlotId, checkout: "payment" }));
  }

  // Cierra el checkout: acá solo se decide la navegación y, si corresponde,
  // se vacía el carrito (BRT-88: cierre confirmado).
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
      clearSavedCart();
    }
    if (!selectedSlotId) return;
    const depth = checkoutParam === "payment" ? 2 : checkoutParam === "form" ? 1 : 0;
    if (depth > 0 && checkoutStarted) {
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
    clearSavedCart();
    const retiro = [selectedSlot?.dayLabel, selectedSlot?.pickupTime].filter(Boolean).join(" · ");
    const extra =
      (retiro ? `&pickup=${encodeURIComponent(retiro)}` : "") +
      (selectedSlot?.location ? `&place=${encodeURIComponent(selectedSlot.location)}` : "");
    window.location.href = `/confirmacion?order=${orderId}&status=pending${extra}`;
  }

  /* ─── SLOTS VIEW ────────────────────────────────────────── */
  if (view === "slots") {
    return (
      <div className="min-h-screen bg-white">
        <main className="w-full max-w-[430px] min-[900px]:max-w-[780px] mx-auto px-6 pt-5 pb-10">
          {/* Título — v45 editorial; v48: el filete va ABAJO del título (separa título y foto) */}
          <header className="mb-[22px]">
            <h2 className="brot-h">
              Tu próximo<br /><span style={{ color: "#C8851A" }}>BROT</span>
            </h2>
            <div className="brot-rule mt-5" />
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
      <div className="min-h-screen bg-white">
        <main className="w-full max-w-[430px] md:max-w-none lg:max-w-[1120px] mx-auto px-5 pt-[18px] pb-8 md:px-10 md:pt-8 md:pb-14 lg:px-12 lg:pb-[72px]">
          {/* Cabecera — v45 editorial. En desktop abre con filete navy. */}
          <div className="hidden md:block brot-rule mb-[22px]" />
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-6 mb-5 md:mb-7">
            <div>
              <button
                onClick={() => router.push(buildFlowUrl({ step: "slots" }))}
                aria-label="Cambiar fecha"
                className="block min-h-[44px] -my-[11px] bg-transparent border-none p-0 cursor-pointer text-left"
              >
                {selectedSlot
                  ? <PickupDateRow date={selectedSlot.date} pickupTime={selectedSlot.pickupTime} />
                  : <span className="brot-kick">Cambiar fecha</span>}
              </button>
              {/* v49: fila de fecha (toca para cambiar de fecha) arriba del título */}
              <h2 className="brot-h brot-h--web mt-4">
                Elegí tu <span style={{ color: "#C8851A" }}>BROT</span>
              </h2>
            </div>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-[22px] lg:gap-[26px]">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/5] md:aspect-[4/3] bg-stone/20" />
                  <div className="pt-3 space-y-2">
                    <div className="h-4 rounded bg-stone/10" />
                    <div className="h-3 rounded bg-stone/10 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="brot-menu grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-9">
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

        {isCheckoutOpen && selectedSlotId && selectedSlot && checkoutStarted && (
          <OrderModal
            items={cartItems}
            slotId={selectedSlotId}
            slotDate={selectedSlot.date}
            pickupTime={selectedSlot.pickupTime}
            canAddMore={products.some((p) => p.hasStock && !((cart[p.id] ?? 0) > 0))}
            step={checkoutParam === "payment" ? "payment" : "form"}
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
  // BRT-136: landing pública nueva (v31) — reemplaza el stack de
  // secciones de BRT-130/135 entero. El CTA "Elegí tu BROT" del rail
  // fijo dispara la misma navegación de siempre (mismo buildFlowUrl de
  // BRT-95), sin cambios de comportamiento del flujo de pedido.
  const goToSlots = () => router.push(buildFlowUrl({ step: "slots" }));
  return <HomeLanding onReservar={goToSlots} />;
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
