"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { Icon } from "./Icon";

export function PublicHeader() {
  const pathname = usePathname();
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const links = [
    { href: "/", l: "Inicio" },
    { href: "/comprar", l: "Comprar" },
    { href: "/rentar", l: "Rentar" },
    { href: "/nosotros", l: "Nosotros" },
    { href: "/contacto", l: "Contacto" },
  ];
  return (
    <header className="sticky top-0 z-30 glass border-b border-ink-line">
      <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
        <Link href="/" className="block"><Logo className="h-14" /></Link>
        <nav className="hidden md:flex items-center gap-8">
          {links.map(n => (
            <Link key={n.href} href={n.href} className={`text-sm transition ${pathname === n.href ? "text-ink font-medium" : "text-ink-muted hover:text-ink"}`}>
              {n.l}
            </Link>
          ))}
        </nav>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-full">
          <Icon name="chat" className="w-4 h-4" /> WhatsApp
        </a>
      </div>
    </header>
  );
}
