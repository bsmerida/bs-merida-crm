// app/api/auth/signout/route.ts
// Cierra la sesión (las cookies solo se pueden borrar desde un route handler)
// y manda a /login. Se usa cuando un admin desactiva a un usuario.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  await createClient().auth.signOut();
  const url = new URL("/login", req.url);
  if (req.nextUrl.searchParams.get("disabled")) url.searchParams.set("disabled", "1");
  return NextResponse.redirect(url);
}
