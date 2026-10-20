import HomeClient from "./HomeClient";
import { getOpenSlots } from "@/lib/openSlots";
import type { LandingStatus } from "@/components/home/HomeLanding";

// v59: la landing muestra si hay una fecha abierta (pill "Elegí tu BROT" /
// "Avisame cuando abra" y la línea de estado del hero). El estado se calcula en
// el servidor con la misma fuente que el flujo de pedidos (getOpenSlots), así el
// HTML ya llega con el estado correcto y no parpadea.
export const dynamic = "force-dynamic";

export default async function Page() {
  const [next] = await getOpenSlots(new Date(), 1);

  const landingStatus: LandingStatus = next
    ? {
        open: true,
        // La fecha se guarda a las 12:00 UTC: se formatea en UTC para que el día
        // no dependa de la zona horaria del servidor. Ej.: "sábado 27".
        pickupLabel: `${next.date.toLocaleDateString("es-AR", { weekday: "long", timeZone: "UTC" })} ${next.date.getUTCDate()}`,
      }
    : { open: false };

  return <HomeClient landingStatus={landingStatus} />;
}
