// lib/push.ts
// Envío de notificaciones push. Se llama directo desde el servidor, en lugar
// de hacer fetch a /api/push/send (que estaba expuesto sin autenticación).
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(`mailto:${process.env.VAPID_CONTACT_EMAIL || "bertha@duclaud.com.mx"}`, pub, priv);
  configured = true;
  return true;
}

export async function sendPush(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
): Promise<number> {
  if (!userIds.length || !configure()) return 0;

  const db = createAdminClient();
  const { data: subs } = await db.from("push_subscriptions").select("*").in("profile_id", userIds);
  if (!subs?.length) return 0;

  const message = JSON.stringify({
    title: payload.title.slice(0, 120),
    body: payload.body.slice(0, 300),
    url: payload.url?.startsWith("/") ? payload.url : "/admin",
  });

  let sent = 0;
  await Promise.allSettled(subs.map(async sub => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, message);
      sent++;
    } catch (err: any) {
      // 404/410: la suscripción ya no existe en el navegador
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await db.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }));
  return sent;
}
