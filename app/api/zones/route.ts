import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();

  const { data } = await supabase
    .from("properties")
    .select("zone, city, state, lat, lng")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .eq("status", "Disponible");

  if (!data) return NextResponse.json([]);

  // Agrupar por zona+ciudad y calcular centroide promedio
  const map = new Map<string, { name: string; city: string; lats: number[]; lngs: number[]; count: number }>();

  for (const p of data) {
    const zone = p.zone || p.city || "";
    if (!zone) continue;
    const key = `${zone}||${p.city}`;
    if (!map.has(key)) map.set(key, { name: zone, city: p.city || "", lats: [], lngs: [], count: 0 });
    const entry = map.get(key)!;
    entry.lats.push(Number(p.lat));
    entry.lngs.push(Number(p.lng));
    entry.count++;
  }

  const zones = Array.from(map.values())
    .map(z => ({
      name: z.name,
      city: z.city,
      label: z.city ? `${z.name}, ${z.city}` : z.name,
      lat: z.lats.reduce((a, b) => a + b, 0) / z.lats.length,
      lng: z.lngs.reduce((a, b) => a + b, 0) / z.lngs.length,
      count: z.count,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json(zones);
}
