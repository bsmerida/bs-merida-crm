// app/cita-elegir/page.tsx
// El cliente revisa el horario que eligió en el correo y lo confirma con un botón.
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { etiquetaFecha } from "@/lib/citas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirmar visita — Duclaud Bienes Raíces", robots: { index: false } };

export default async function CitaElegirPage({ searchParams }: { searchParams: { token?: string; option?: string } }) {
  const token = searchParams.token || "";
  const optionIdx = Number(searchParams.option || "0");

  const { data: request } = token
    ? await createAdminClient().from("appointment_requests")
        .select("status, property_title, agent_options").eq("client_token", token).maybeSingle()
    : { data: null };
  const chosen = (request?.agent_options as { date: string; time: string }[] | undefined)?.[optionIdx];
  const yaAtendida = request && request.status !== "rescheduled";

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
        {!request || (!chosen && !yaAtendida) ? (
          <>
            <h1 className="font-serif text-2xl text-navy mb-3">Enlace no válido</h1>
            <p className="text-sm text-ink-muted">Este enlace no es válido o ya expiró. Contacta directamente con tu asesor.</p>
          </>
        ) : yaAtendida ? (
          <>
            <h1 className="font-serif text-2xl text-navy mb-3">Esta visita ya fue atendida</h1>
            <p className="text-sm text-ink-muted">Revisa tu correo con los detalles o contacta a tu asesor si necesitas cambiarla.</p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl text-navy mb-3">Confirma tu visita</h1>
            {request.property_title && <p className="text-sm text-ink-muted">{request.property_title}</p>}
            <div className="border-2 border-gold/40 rounded-2xl px-6 py-4 my-5">
              <p className="text-lg font-semibold text-navy">{etiquetaFecha(chosen!.date)}</p>
              <p className="text-sm text-ink-muted">a las {chosen!.time} hrs</p>
            </div>
            <form method="post" action="/api/citas/confirmar-cliente">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="option" value={String(optionIdx)} />
              <button type="submit"
                className="w-full bg-navy text-white font-medium px-8 py-3 rounded-full hover:bg-navy/90 transition text-sm">
                Confirmar este horario
              </button>
            </form>
            <p className="text-xs text-ink-muted mt-4">¿Prefieres otro horario? Responde el correo o llama a tu asesor.</p>
          </>
        )}
        <Link href="/" className="inline-block mt-6 text-sm text-ink-muted hover:underline">Ir al inicio</Link>
      </div>
    </div>
  );
}
