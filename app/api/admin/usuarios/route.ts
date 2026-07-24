// app/api/admin/usuarios/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

// POST — crear usuario
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo admins" }, { status: 403 });

  const { email, password, full_name, role } = await req.json();
  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Crear usuario en Auth
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !newUser.user) {
    return NextResponse.json({ error: authError?.message || "Error al crear usuario" }, { status: 500 });
  }

  // Crear perfil
  const { error: profileError } = await admin.from("profiles").insert({
    id:        newUser.user.id,
    email,
    full_name,
    role,
    active:    true,
  });

  if (profileError) {
    // Rollback — borrar el usuario de auth
    await admin.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: "Error al crear perfil" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: newUser.user.id });
}

// PATCH — actualizar rol o estado
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo admins" }, { status: 403 });

  const { user_id, role, active } = await req.json();
  if (!user_id) return NextResponse.json({ error: "Falta user_id" }, { status: 400 });

  // No se puede desactivar a sí mismo
  if (user_id === user.id) {
    return NextResponse.json({ error: "No puedes modificar tu propio perfil" }, { status: 400 });
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const updates: any = {};
  if (role   !== undefined) updates.role   = role;
  if (active !== undefined) updates.active = active;

  const { error } = await admin.from("profiles").update(updates).eq("id", user_id);
  if (error) return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE — eliminar usuario
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo admins" }, { status: 403 });

  const { user_id } = await req.json();
  if (!user_id || user_id === user.id) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await admin.from("profiles").delete().eq("id", user_id);
  await admin.auth.admin.deleteUser(user_id);

  return NextResponse.json({ ok: true });
}
