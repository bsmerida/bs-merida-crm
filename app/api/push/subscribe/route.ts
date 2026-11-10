// app/api/push/subscribe/route.ts
// (Antes la carpeta se llamaba "suscribe" y el navegador llamaba a "subscribe": 404.)
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { auth, error: authError } = await requireAuth();
  if (authError) return authError;

  const { subscription } = await req.json().catch(() => ({}));
  const endpoint = subscription?.endpoint;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") ||
      !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  const { error } = await createAdminClient().from("push_subscriptions").upsert({
    profile_id: auth.userId,
    endpoint,
    p256dh:     subscription.keys.p256dh,
    auth:       subscription.keys.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { auth, error: authError } = await requireAuth();
  if (authError) return authError;

  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint !== "string") return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });

  // Solo puede borrar sus propias suscripciones
  await createAdminClient().from("push_subscriptions").delete()
    .eq("endpoint", endpoint).eq("profile_id", auth.userId);
  return NextResponse.json({ ok: true });
}
