import { NextResponse } from "next/server";
import { getFeatureFlags } from "@/lib/featureFlags";

// BRT-268: lectura pública del estado de los flags, para que la web decida
// qué mostrar (ej. el botón de Mercado Pago). Solo lectura; los cambios van
// por /api/admin/feature-flags.
export async function GET() {
  return NextResponse.json(await getFeatureFlags());
}
