import Link from "next/link";
import Image from "next/image";
import { DUCLAUD_LOGO_WHITE } from "@/lib/duclaud-logo";

export function PublicFooter() {
  const wa    = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const phone = process.env.NEXT_PUBLIC_BUSINESS_PHONE    || "999 303 4815";
  const email = process.env.NEXT_PUBLIC_BUSINESS_EMAIL    || "contacto@duclaud.mx";
  const addr  = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS  || "Mérida, Yucatán · México";

  return (
    <footer className="bg-navy text-white mt-24">
      <div className="max-w-7xl mx-auto px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-white/10">
          <div className="md:col-span-5">
            <div className="mb-5">
              <Image
                src={DUCLAUD_LOGO_WHITE}
                alt="D.UCLAUD Bienes Raíces"
                width={200}
                height={56}
                className="h-12 w-auto"
              />
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Consultoría inmobiliaria con criterio legal y financiero. Socios AMPI. Mérida, Yucatán.
            </p>
          </div>
          <div className="md:col-span-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 mb-5">Navegación</div>
            <ul className="space-y-3">
              {[["Inicio","/"],["Comprar","/comprar"],["Rentar","/rentar"],["La firma","/nosotros"],["Contacto","/contacto"]].map(([l,h]) => (
                <li key={h}><Link href={h} className="text-sm text-white/45 hover:text-gold transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 mb-5">Contacto</div>
            <ul className="space-y-3 text-sm text-white/45">
              <li><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">{phone}</a></li>
              <li><a href={`mailto:${email}`} className="hover:text-gold transition-colors">{email}</a></li>
              <li>{addr}</li>
            </ul>
          </div>
        </div>
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-white/20">
          <span>© {new Date().getFullYear()} Duclaud Consultoría Inmobiliaria. Todos los derechos reservados.</span>
          <div className="flex items-center gap-5">
            <Link href="/aviso-privacidad" className="hover:text-white/40 transition-colors">Aviso de privacidad</Link>
            <span>AMPI · PROFECO 5589-2022</span>
            <Link href="/login" className="hover:text-white/40 transition-colors">Acceso staff</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
