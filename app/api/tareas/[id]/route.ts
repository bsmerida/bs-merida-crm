// app/api/tareas/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const supabase = createClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select(`*, assignee:profiles!assigned_to(id, full_name, initials), lead:leads(id, name)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
