// app/api/tareas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({ ...body, created_by: user.id })
    .select(`*, assignee:profiles!assigned_to(id, full_name, initials), lead:leads(id, name)`)
    .single();

  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  // Notificar al asignado si es diferente al creador
  if (task.assigned_to && task.assigned_to !== user.id) {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.duclaud.com.mx'}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '📋 Nueva tarea asignada',
        body:  body.title + (body.due_at ? ` · Vence el ${body.due_at}` : ''),
        url:   '/admin/tareas',
        user_ids: [task.assigned_to],
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ task });
}

