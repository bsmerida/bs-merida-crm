// lib/auth.ts
// Verificación de sesión y rol para rutas API y páginas del servidor.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "asesor" | "asistente";
export const ROLES: Role[] = ["admin", "asesor", "asistente"];

export type AuthContext = { userId: string; role: Role | null; isAdmin: boolean };

// Devuelve el usuario autenticado + su rol, o null si no hay sesión
// o si su perfil está desactivado.
export async function getAuth(): Promise<AuthContext | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role, active").eq("id", user.id).single();
  if (profile && profile.active === false) return null;
  const role = (profile?.role ?? null) as Role | null;
  return { userId: user.id, role, isAdmin: role === "admin" };
}

// Para rutas API: devuelve el contexto o una respuesta 401/403 lista para retornar.
export async function requireAuth(
  opts: { admin?: boolean } = {},
): Promise<{ auth: AuthContext; error?: never } | { auth?: never; error: NextResponse }> {
  const auth = await getAuth();
  if (!auth) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  if (opts.admin && !auth.isAdmin) {
    return { error: NextResponse.json({ error: "Solo administradores" }, { status: 403 }) };
  }
  return { auth };
}

// Un registro con agent_id lo puede gestionar el admin o el asesor asignado.
export function canManage(auth: AuthContext, agentId: string | null | undefined): boolean {
  return auth.isAdmin || (!!agentId && agentId === auth.userId);
}
