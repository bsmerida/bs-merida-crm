// app/api/tareas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { sendPush } from "@/lib/push";
import { pickTaskFields, TASK_SELECT } from "@/lib/tasks";

export async function POST(req: NextRequest) {
  const { auth, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const fields = body && pickTaskFields(body);
  if (!fields?.title) return NextResponse.json({ error: "El título es requerido" }, { status: 400 });

  // Un asesor solo se puede asignar tareas a sí mismo
  if (!auth.isAdmin) fields.assigned_to = auth.userId;

  const { data: task, error } = await createClient()
    .from("tasks")
    .insert({ ...fields, created_by: auth.userId })
    .select(TASK_SELECT)
    .single();
  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });

  if (task.assigned_to && task.assigned_to !== auth.userId) {
    await sendPush([task.assigned_to], {
      title: "📋 Nueva tarea asignada",
      body:  task.title + (task.due_at ? ` · Vence el ${task.due_at}` : ""),
      url:   "/admin/tareas",
    }).catch(() => {});
  }

  return NextResponse.json({ task });
}
