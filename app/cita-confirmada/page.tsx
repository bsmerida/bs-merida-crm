// app/cita-confirmada/page.tsx
import Link from "next/link";

export default function CitaConfirmadaPage({
  searchParams,
}: {
  searchParams: { date?: string; time?: string; status?: string };
}) {
  const already = searchParams.status === "already";
  const error   = searchParams.status === "error";

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </div>
            <h2 className="font-serif text-2xl text-navy mb-3">Algo salió mal</h2>
            <p className="text-sm text-ink-muted">Este enlace no es válido o ya expiró. Contacta directamente con tu asesor.</p>
          </>
        ) : already ? (
          <>
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="font-serif text-2xl text-navy mb-3">Ya está confirmada</h2>
            <p className="text-sm text-ink-muted">Tu visita ya fue confirmada anteriormente. Revisa tu correo con los detalles.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="font-serif text-2xl text-navy mb-3">¡Visita confirmada!</h2>
            {searchParams.date && (
              <div className="border-2 border-gold/40 rounded-2xl px-6 py-4 my-4">
                <p className="text-lg font-semibold text-navy">{searchParams.date}</p>
                <p className="text-sm text-ink-muted">a las {searchParams.time} hrs</p>
              </div>
            )}
            <p className="text-sm text-ink-muted mt-2">
              Recibirás un correo con todos los detalles. Tu asesor se pondrá en contacto contigo próximamente.
            </p>
          </>
        )}
        <Link href="/"
          className="inline-block mt-8 bg-navy text-white font-medium px-8 py-3 rounded-full hover:bg-navy/90 transition text-sm">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
