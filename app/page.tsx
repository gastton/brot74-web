import HomeClient from "./HomeClient";
import { getOpenSlots } from "@/lib/openSlots";

// v59: la landing muestra si hay una fecha abierta (pill "Elegí tu BROT" / "Tu próximo
// BROT"). El estado se calcula en el servidor con la misma fuente que el flujo de
// pedidos (getOpenSlots), así el HTML ya llega con el estado correcto y no parpadea.
export const dynamic = "force-dynamic";

export default async function Page() {
  const open = (await getOpenSlots(new Date(), 1)).length > 0;
  return <HomeClient landingStatus={{ open }} />;
}
