// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Cliente normal — usa anon key + sesión del usuario
// Para páginas públicas y auth
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// Next 14 guarda en su caché de datos las consultas del servidor que se hacen antes
// de leer cookies: la página de editar propiedad mostraba la versión de la primera
// visita aunque la base ya tuviera cambios. Con la llave de servicio siempre se lee
// el dato actual.
export const sinCache: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

// Cliente admin — usa service role key
// Bypasea RLS completamente — usar SOLO en rutas admin protegidas
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
      global: { fetch: sinCache },
    }
  );
}
