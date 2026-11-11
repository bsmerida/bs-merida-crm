// app/api/cron/notificaciones/route.ts
// Llamado cada hora por GitHub Actions (.github/workflows/notificaciones.yml).
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push";
import { addDaysYmd, isVisitInNextHourWindow, meridaParts, meridaSlotToDate } from "@/lib/time";

export const dynamic = "force-dynamic";

function validSecret(given: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function groupBy<T>(rows: T[], key: (r: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const r of rows) (out[key(r)] ||= []).push(r);
  return out;
}

const plural = (n: number, s: string, p = `${s}s`) => (n === 1 ? s : p);

export async function GET(req: NextRequest) {
  if (!validSecret(req.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = createAdminClient();
  const now = new Date();
  const { ymd: today, hour } = meridaParts(now);
  const tomorrow = addDaysYmd(today, 1);
  const results: string[] = [];

  // Una sola consulta de visitas confirmadas de hoy en adelante
  const { data: visits } = await db
    .from("appointment_requests")
    .select("agent_id, client_name, property_title, confirmed_option")
    .eq("status", "confirmed")
    .gte("confirmed_option->>date", today)
    .not("agent_id", "is", null);

  // ── 1. Visita en ~1 hora (cada corrida) ──────────────────────────────────
  for (const v of visits || []) {
    if (!v.confirmed_option) continue;
    if (isVisitInNextHourWindow(meridaSlotToDate(v.confirmed_option), now)) {
      await sendPush([v.agent_id], {
        title: "🏠 Visita en 1 hora",
        body:  `${v.client_name} visita ${v.property_title || "una propiedad"} a las ${v.confirmed_option.time} hrs`,
        url:   "/admin/citas",
      });
      results.push(`visita-1h: ${v.agent_id}`);
    }
  }

  // ── 2. Visitas de mañana (8am Mérida) ─────────────────────────────────────
  if (hour === 8) {
    for (const v of (visits || []).filter(v => v.confirmed_option?.date === tomorrow)) {
      await sendPush([v.agent_id], {
        title: "📅 Visita mañana",
        body:  `${v.client_name} visita ${v.property_title || "una propiedad"} a las ${v.confirmed_option.time} hrs`,
        url:   "/admin/citas",
      });
      results.push(`visita-mañana: ${v.agent_id}`);
    }
  }

  // ── 3-5. Tareas y seguimiento (7am Mérida) ────────────────────────────────
  if (hour === 7) {
    const { data: tasks } = await db
      .from("tasks")
      .select("title, assigned_to, due_at")
      .in("due_at", [today, tomorrow])
      .neq("status", "done")
      .not("assigned_to", "is", null);

    for (const [when, label, emoji] of [[today, "hoy", "⚠️"], [tomorrow, "mañana", "📋"]] as const) {
      const byUser = groupBy((tasks || []).filter(t => t.due_at === when), t => t.assigned_to);
      for (const [userId, list] of Object.entries(byUser)) {
        await sendPush([userId], {
          title: `${emoji} ${list.length} ${plural(list.length, "tarea")} ${plural(list.length, "vence", "vencen")} ${label}`,
          body:  list.map(t => t.title).join(", "),
          url:   "/admin/tareas",
        });
        results.push(`tareas-${label}: ${userId} (${list.length})`);
      }
    }

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString();
    const { data: staleLeads } = await db
      .from("leads")
      .select("name, agent_id")
      .not("status", "in", '("Cerrado ganado","Cerrado perdido","Cerrado","Perdido")')
      .not("agent_id", "is", null)
      .lt("last_contact_at", sevenDaysAgo);

    for (const [userId, leads] of Object.entries(groupBy(staleLeads || [], l => l.agent_id))) {
      await sendPush([userId], {
        title: `👥 ${leads.length} ${plural(leads.length, "cliente")} sin seguimiento`,
        body:  `${leads.slice(0, 3).map(l => l.name).join(", ")}${leads.length > 3 ? ` y ${leads.length - 3} más` : ""} llevan +7 días sin contacto`,
        url:   "/admin/leads",
      });
      results.push(`seguimiento: ${userId} (${leads.length})`);
    }
  }

  return NextResponse.json({ ok: true, ran: results, merida: { today, hour } });
}
