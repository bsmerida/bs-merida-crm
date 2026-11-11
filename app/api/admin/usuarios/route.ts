// app/api/admin/usuarios/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth, ROLES, type Role } from "@/lib/auth";
import { isUuid } from "@/lib/security";

// POST — crear usuario
export async function POST(req: NextRequest) {
  const { auth, error: authError } = await requireAuth({ admin: true });
  if (authError) return authError;

  const { email, password, full_name, role } = await req.json().catch(() => ({}));
  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }
  if (!ROLES.includes(role as Role)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  if (typeof password !== "string" || password.length < 10) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 10 caracteres" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Crear usuario en Auth
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message || "Error al crear usuario" }, { status: 400 });
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
  const { auth, error: authError } = await requireAuth({ admin: true });
  if (authError) return authError;

  const { user_id, role, active } = await req.json().catch(() => ({}));
  if (!isUuid(user_id)) return NextResponse.json({ error: "Falta user_id" }, { status: 400 });
  if (role !== undefined && !ROLES.includes(role)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  if (active !== undefined && typeof active !== "boolean") return NextResponse.json({ error: "Valor inválido" }, { status: 400 });

  // No se puede desactivar a sí mismo
  if (user_id === auth.userId) {
    return NextResponse.json({ error: "No puedes modificar tu propio perfil" }, { status: 400 });
  }

  const admin = createAdminClient();

  const updates: any = {};
  if (role   !== undefined) updates.role   = role;
  if (active !== undefined) updates.active = active;

  const { error } = await admin.from("profiles").update(updates).eq("id", user_id);
  if (error) return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE — eliminar usuario
export async function DELETE(req: NextRequest) {
  const { auth, error: authError } = await requireAuth({ admin: true });
  if (authError) return authError;

  const { user_id } = await req.json().catch(() => ({}));
  if (!isUuid(user_id) || user_id === auth.userId) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  const admin = createAdminClient();

  await admin.from("profiles").delete().eq("id", user_id);
  const { error } = await admin.auth.admin.deleteUser(user_id);
  if (error) return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
