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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task });
}
