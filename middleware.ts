import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Rutas que requieren autenticación
const PROTECTED = ["/admin", "/api/tareas", "/api/push", "/api/cron"];

// Rutas de API que solo acepta el CRON_SECRET
const CRON_ROUTES = ["/api/cron/notificaciones"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Proteger rutas cron con secret ───────────────────────────────────────
  if (CRON_ROUTES.some(r => pathname.startsWith(r))) {
    const secret = request.headers.get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // ── Bloquear acceso a /admin sin sesión ───────────────────────────────────
  if (PROTECTED.some(r => pathname.startsWith(r))) {
    const response = await updateSession(request);
    return response;
  }

  // ── OPTIONS preflight para CORS ───────────────────────────────────────────
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin":  process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age":       "86400",
      },
    });
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
