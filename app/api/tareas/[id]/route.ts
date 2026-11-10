// app/api/tareas/[id]/route.ts
// Antes este archivo era una copia de /api/tablero/[id] (POST/DELETE sobre
// board_properties): editar una tarea daba 405 y "borrar" no borraba nada.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, type AuthContext } from "@/lib/auth";
import { pickTaskFields, TASK_SELECT } from "@/lib/tasks";

async function loadOwnedTask(id: string, auth: AuthContext) {
  const { data: task } = await createClient()
    .from("tasks").select("id, assigned_to, created_by").eq("id", id).single();
  if (!task) return null;
  const allowed = auth.isAdmin || task.assigned_to === auth.userId || task.created_by === auth.userId;
  return allowed ? task : null;
}

// PATCH /api/tareas/[id] — editar o cambiar estado
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error: authError } = await requireAuth();
  if (authError) return authError;
  if (!(await loadOwnedTask(params.id, auth))) {
    return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const fields = body ? pickTaskFields(body) : {};
  if ("title" in fields && !fields.title) return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
  if (!auth.isAdmin) delete fields.assigned_to; // reasignar es cosa del admin
  if (fields.status) fields.completed_at = fields.status === "done" ? new Date().toISOString() : null;

  const { data: task, error } = await createClient()
    .from("tasks").update(fields).eq("id", params.id).select(TASK_SELECT).single();
  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  return NextResponse.json({ task });
}

// DELETE /api/tareas/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error: authError } = await requireAuth();
  if (authError) return authError;
  if (!(await loadOwnedTask(params.id, auth))) {
    return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
  }

  const { error } = await createClient().from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
