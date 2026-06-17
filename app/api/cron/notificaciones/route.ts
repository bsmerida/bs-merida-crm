// app/api/cron/notificaciones/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";

async function sendPush(user_ids: string[], title: string, body: string, url: string) {
  await fetch(`${SITE}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, url, user_ids }),
  }).catch(() => {});
}

export async function GET(req: NextRequest) {
  // Verificar secret para que solo GitHub Actions pueda llamar esto
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now     = new Date();
  const results: string[] = [];

  // ── 1. Visita en 1 hora ───────────────────────────────────────────────────
  const in1h    = new Date(now.getTime() + 60 * 60_000);
  const in1hMin = new Date(in1h.getTime() - 5 * 60_000).toISOString();
  const in1hMax = new Date(in1h.getTime() + 5 * 60_000).toISOString();

  const { data: visits1h } = await supabase
    .from("appointment_requests")
    .select("*, agent:profiles!agent_id(id, full_name)")
    .eq("status", "confirmed")
    .gte("confirmed_option->>date", now.toISOString().split("T")[0])
    .not("agent_id", "is", null);

  for (const v of visits1h || []) {
    if (!v.confirmed_option) continue;
    const visitTime = new Date(`${v.confirmed_option.date}T${v.confirmed_option.time}:00-06:00`);
    if (visitTime >= new Date(in1hMin) && visitTime <= new Date(in1hMax)) {
      await sendPush(
        [v.agent_id],
        "🏠 Visita en 1 hora",
        `${v.client_name} visita ${v.property_title || "una propiedad"} a las ${v.confirmed_option.time} hrs`,
        "/admin/citas"
      );
      results.push(`visita-1h: ${v.client_name}`);
    }
  }

  // ── 2. Visita mañana ──────────────────────────────────────────────────────
  const isEightAM = now.getHours() === 8 && now.getMinutes() < 10;
  if (isEightAM) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: visitsTomorrow } = await supabase
      .from("appointment_requests")
      .select("*")
      .eq("status", "confirmed")
      .not("agent_id", "is", null);

    for (const v of visitsTomorrow || []) {
      if (v.confirmed_option?.date === tomorrowStr) {
        await sendPush(
          [v.agent_id],
          "📅 Visita mañana",
          `${v.client_name} visita ${v.property_title || "una propiedad"} a las ${v.confirmed_option.time} hrs`,
          "/admin/citas"
        );
        results.push(`visita-mañana: ${v.client_name}`);
      }
    }
  }

  // ── 3. Tareas que vencen hoy ──────────────────────────────────────────────
  const isSevenAM = now.getHours() === 7 && now.getMinutes() < 10;
  if (isSevenAM) {
    const todayStr = now.toISOString().split("T")[0];

    const { data: tasksToday } = await supabase
      .from("tasks")
      .select("*, assignee:profiles!assigned_to(id)")
      .eq("due_at", todayStr)
      .neq("status", "done")
      .not("assigned_to", "is", null);

    const byUser: Record<string, any[]> = {};
    for (const t of tasksToday || []) {
      if (!byUser[t.assigned_to]) byUser[t.assigned_to] = [];
      byUser[t.assigned_to].push(t);
    }

    for (const [userId, tasks] of Object.entries(byUser)) {
      await sendPush(
        [userId],
        `⚠️ ${tasks.length} tarea${tasks.length > 1 ? "s" : ""} vence${tasks.length > 1 ? "n" : ""} hoy`,
        tasks.map(t => t.title).join(", "),
        "/admin/tareas"
      );
      results.push(`tareas-hoy: ${userId} (${tasks.length})`);
    }

    // ── 4. Tareas que vencen mañana ─────────────────────────────────────────
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: tasksTomorrow } = await supabase
      .from("tasks")
      .select("*")
      .eq("due_at", tomorrowStr)
      .neq("status", "done")
      .not("assigned_to", "is", null);

    const byUserTomorrow: Record<string, any[]> = {};
    for (const t of tasksTomorrow || []) {
      if (!byUserTomorrow[t.assigned_to]) byUserTomorrow[t.assigned_to] = [];
      byUserTomorrow[t.assigned_to].push(t);
    }

    for (const [userId, tasks] of Object.entries(byUserTomorrow)) {
      await sendPush(
        [userId],
        `📋 ${tasks.length} tarea${tasks.length > 1 ? "s" : ""} vence${tasks.length > 1 ? "n" : ""} mañana`,
        tasks.map(t => t.title).join(", "),
        "/admin/tareas"
      );
      results.push(`tareas-mañana: ${userId} (${tasks.length})`);
    }

    // ── 5. Clientes sin seguimiento +7 días ────────────────────────────────
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: staleLeads } = await supabase
      .from("leads")
      .select("*, agent:profiles!agent_id(id)")
      .neq("status", "Cerrado")
      .neq("status", "Perdido")
      .not("agent_id", "is", null)
      .lt("last_contact_at", sevenDaysAgo.toISOString());

    const byUserLeads: Record<string, any[]> = {};
    for (const l of staleLeads || []) {
      if (!byUserLeads[l.agent_id]) byUserLeads[l.agent_id] = [];
      byUserLeads[l.agent_id].push(l);
    }

    for (const [userId, leads] of Object.entries(byUserLeads)) {
      await sendPush(
        [userId],
        `👥 ${leads.length} cliente${leads.length > 1 ? "s" : ""} sin seguimiento`,
        `${leads.slice(0, 3).map((l: any) => l.name).join(", ")}${leads.length > 3 ? ` y ${leads.length - 3} más` : ""} llevan +7 días sin contacto`,
        "/admin/leads"
      );
      results.push(`seguimiento: ${userId} (${leads.length})`);
    }
  }

  return NextResponse.json({ ok: true, ran: results, time: now.toISOString() });
}
