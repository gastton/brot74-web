import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getFeatureFlags, isFeatureFlagKey, setFeatureFlag } from "@/lib/featureFlags";

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  return NextResponse.json(await getFeatureFlags());
}

// Prende o apaga un flag: { key: "mpCheckout", enabled: true }.
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { key, enabled } = await req.json();

  if (!isFeatureFlagKey(key)) {
    return NextResponse.json({ error: "Flag desconocido" }, { status: 400 });
  }
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled debe ser boolean" }, { status: 400 });
  }

  await setFeatureFlag(key, enabled);

  return NextResponse.json(await getFeatureFlags());
}
