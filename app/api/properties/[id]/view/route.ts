// app/api/properties/[id]/view/route.ts
// Registra una vista de la ficha pública. Antes este código vivía en
// app/api/propiedad/[id]/pdf/view.route.ts, que Next.js no reconoce como ruta,
// y PropertyViewTracker llamaba a esta URL que no existía: no se contaba ninguna vista.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { clientIp, isUuid, rateLimit } from "@/lib/security";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ ok: false }, { status: 400 });
  // Una vista por IP y propiedad cada 30 min, para que recargar no infle el conteo
  if (!await rateLimit(`view:${clientIp(req.headers)}:${params.id}`, 1, 30 * 60 * 1000)) {
    return NextResponse.json({ ok: true, counted: false });
  }
  const { error } = await createAdminClient()
    .from("property_views").insert({ property_id: params.id, source: "web" });
  return NextResponse.json({ ok: !error });
}
