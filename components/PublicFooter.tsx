import Link from "next/link";
import { Logo } from "./Logo";
import { Icon } from "./Icon";

export function PublicFooter() {
  const addr = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "Calle 13 #147, Col. México Oriente, Mérida, Yucatán";
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const phone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || "999 303 4815";
  const email = process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "bsmerida19@gmail.com";

  const social = [
    { name: "Facebook", href: "https://www.facebook.com/ContactoInmobiliariaBS/", icon: "facebook" },
    { name: "Instagram", href: "https://www.instagram.com/inmobiliariabs/", icon: "instagram" },
  ];

  return (
    <footer className="border-t border-ink-line mt-20 bg-white">
      <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <Logo />
          <p className="text-sm text-ink-muted mt-4 leading-relaxed max-w-xs">
            Asesores inmobiliarios certificados con presencia en Yucatán, Quintana Roo y Nuevo León.
          </p>
          <div className="flex items-center gap-3 mt-6">
            {social.map(s => (
              <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name}
                className="w-9 h-9 rounded-full border border-ink-line flex items-center justify-center text-ink-muted hover:text-brand-600 hover:border-brand-300 transition">
                <Icon name={s.icon} className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-ink-muted font-semibold mb-3">Empresa</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/nosotros" className="text-ink hover:text-brand-600">Nosotros</Link></li>
            <li><Link href="/contacto" className="text-ink hover:text-brand-600">Contacto</Link></li>
            <li><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-brand-600">WhatsApp</a></li>
            <li><a href={`tel:${phone.replace(/\s/g, "")}`} className="text-ink hover:text-brand-600">{phone}</a></li>
            <li><a href={`mailto:${email}`} className="text-ink hover:text-brand-600 break-all">{email}</a></li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-ink-muted font-semibold mb-3">Legal</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/aviso-privacidad" className="text-ink hover:text-brand-600">Aviso de privacidad</Link></li>
            <li><Link href="/derechos-clientes" className="text-ink hover:text-brand-600">Derechos del consumidor</Link></li>
            <li className="text-ink-muted">PROFECO 5589-2022</li>
            <li className="text-ink-muted">AMPI Mérida</li>
            <li><Link href="/login" className="text-ink-soft hover:text-ink-muted">Acceso staff</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-line py-5">
        <div className="max-w-7xl mx-auto px-8 text-xs text-ink-muted text-center">
          © {new Date().getFullYear()} Inmobiliaria BS Mérida · {addr}
        </div>
      </div>
    </footer>
  );
}
