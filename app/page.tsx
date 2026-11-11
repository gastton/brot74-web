import HomeClient from "./HomeClient";
import { getOpenSlots } from "@/lib/openSlots";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/featureFlags";

// v59: la landing muestra si hay una fecha abierta (pill "Elegí tu BROT" / "Tu próximo
// BROT"). El estado se calcula en el servidor con la misma fuente que el flujo de
// pedidos (getOpenSlots), así el HTML ya llega con el estado correcto y no parpadea.
export const dynamic = "force-dynamic";

export default async function Page() {
  const [slots, mpCheckout] = await Promise.all([
    getOpenSlots(new Date(), 1),
    // BRT-267: los textos de "¿Cómo funciona?" mencionan MP solo con el toggle prendido.
    isFeatureEnabled(FEATURE_FLAGS.mpCheckout),
  ]);
  return <HomeClient landingStatus={{ open: slots.length > 0 }} mpCheckout={mpCheckout} />;
}
