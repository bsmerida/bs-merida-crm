// app/api/push/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:bertha@duclaud.com.mx",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Rate limiting interno — solo llamadas desde el mismo servidor
function isInternalRequest(req: NextRequest): boolean {
  const origin  = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const site    = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";
  // Permitir llamadas sin origin (server-to-server) o del mismo sitio
  return !origin || origin === site || referer.startsWith(site);
}

export async function POST(req: NextRequest) {
  // Solo llamadas internas o server-side
  if (!isInternalRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { title, body, url, user_ids } = await req.json().catch(() => ({}));
  if (!title || !body) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const query = supabase.from("push_subscriptions").select("*");
  if (user_ids?.length) query.in("profile_id", user_ids);

  const { data: subs } = await query;
  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });

  const payload = JSON.stringify({ title, body, url: url || "/admin" });
  let sent = 0;

  await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );

  return NextResponse.json({ ok: true, sent });
}
