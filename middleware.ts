import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Refresca la sesión de Supabase en cada request y protege /admin (sesión + rol).
// Las rutas /api/* verifican sesión y permisos por sí mismas (lib/auth.ts);
// el cron valida CRON_SECRET en su propia ruta.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|api/cron|api/feed|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
