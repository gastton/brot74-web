import { NextResponse } from "next/server";
import { getOpenSlots } from "@/lib/openSlots";

export async function GET() {
  const visible = (await getOpenSlots(new Date())).map((slot) => ({
    id: slot.id,
    date: slot.date.toISOString(),
    dayLabel: slot.dayLabel,
    pickupTime: slot.pickupTime,
    location: slot.location,
    imageUrl: slot.imageUrl,
    imageFocalX: slot.imageFocalX,
    imageFocalY: slot.imageFocalY,
    imageScale: slot.imageScale,
    orderCutoff: slot.orderCutoff,
    disabled: false,
  }));

  return NextResponse.json(visible);
}
