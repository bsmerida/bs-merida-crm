import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { canManage, requireAuth } from "@/lib/auth";
import { FALLBACK_AGENT_ID } from "@/lib/citas";
import { deleteCalendarEvent, getCalendarAccess } from "@/lib/google-calendar";

// DELETE /api/citas/[id] — cancelar una solicitud (antes no pedía sesión)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error: authError } = await requireAuth();
  if (authError) return authError;

  const db = createAdminClient();
  const { data: appt } = await db.from("appointment_requests").select("*").eq("id", params.id).single();
  const agentId = appt?.agent_id || FALLBACK_AGENT_ID;
  if (!appt || !canManage(auth, agentId)) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  if (appt.google_event_id) {
    const access = await getCalendarAccess(db, agentId);
    if (access) await deleteCalendarEvent(access, appt.google_event_id);
  }

  const { error } = await db.from("appointment_requests").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
