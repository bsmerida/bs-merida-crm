"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { DUCLAUD_LOGO_WHITE } from "@/lib/duclaud-logo";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = { full_name: string | null; email: string | null; role: string; initials: string | null };

const icons: Record<string, JSX.Element> = {
  home:      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/>,
  users:     <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
  building:  <><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M3 9h6M3 15h6M15 3v18M15 9h6M15 15h6"/></>,
  calendar:  <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  check:     <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
  trending:  <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  creditcard: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  coins:     <><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1110.34 18"/><path d="M7 6h1v4"/></>,
  globe:     <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></>,
  settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
  sparkle:   <path d="M12 3l1.88 5.76a1 1 0 00.63.63L20.24 11.35 14.48 13.12a1 1 0 00-.63.63L12 19.5l-1.85-5.75a1 1 0 00-.63-.63L3.76 11.35l5.76-1.96a1 1 0 00.63-.63L12 3z"/>,
  logout:    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>,
  menu:      <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  close:     <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
};

function SvgIcon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="shrink-0">
      {icons[name] ?? <circle cx="12" cy="12" r="9"/>}
    </svg>
  );
}

export function AdminSidebar({ profile, leadsNuevos }: { profile: Profile | null; leadsNuevos: number }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const isAdmin  = profile?.role === "admin";
  const initials = profile?.initials || profile?.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || "D";
  const [open, setOpen] = useState(false);

  const mainNav = [
    { href: "/admin",             label: "Inicio",      icon: "home",     badge: null },
    { href: "/admin/leads",       label: "Clientes",    icon: "users",    badge: leadsNuevos > 0 ? leadsNuevos : null },
    { href: "/admin/propiedades", label: "Propiedades", icon: "building", badge: null },
    { href: "/admin/citas",       label: "Citas",       icon: "calendar", badge: null },
    { href: "/admin/tareas",      label: "Tareas",      icon: "check",    badge: null },
  ];
  const adminNav = [
    { href: "/admin/kpis",     label: "KPIs",     icon: "trending" },
    { href: "/admin/finanzas", label: "Finanzas", icon: "coins"    },
    { href: "/admin/cuentas-por-pagar", label: "Por pagar", icon: "creditcard" },
    { href: "/admin/portales", label: "Portales", icon: "globe"    },
    { href: "/admin/ajustes",  label: "Ajustes",  icon: "settings" },
  ];

  const isActive = (href: string) => pathname === href || (href !== "/admin" && pathname.startsWith(href));

  const item = (href: string, label: string, icon: string, badge?: number | null) => (
    <Link key={href} href={href} onClick={() => setOpen(false)}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm transition-all ${
        isActive(href) ? "bg-gold/15 text-gold font-medium" : "text-white/45 hover:bg-white/6 hover:text-white/75"}`}>
      <SvgIcon name={icon} />
      <span className="flex-1">{label}</span>
      {badge ? <span className="bg-gold text-navy text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span> : null}
    </Link>
  );

  const sidebarContent = (
    <>
      <div className="px-5 py-5 border-b border-white/8">
        <Link href="/admin" className="select-none" onClick={() => setOpen(false)}>
          <Image src={DUCLAUD_LOGO_WHITE} alt="D.UCLAUD Bienes Raíces" width={160} height={44} className="h-10 w-auto" priority/>
          <p className="text-[9px] uppercase tracking-[0.12em] text-white/25 mt-1">Panel administrativo</p>
        </Link>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {mainNav.map(n => item(n.href, n.label, n.icon, n.badge))}
        {isAdmin && (
          <>
            <div className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.16em] px-3 pt-5 pb-2">Análisis</div>
            {adminNav.map(n => item(n.href, n.label, n.icon))}
          </>
        )}
        <div className="mt-4 pt-4 border-t border-white/8">
          <Link href="/admin/asistente" onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              isActive("/admin/asistente") ? "bg-gold/15 text-gold font-medium" : "text-gold/60 hover:bg-gold/10 hover:text-gold"}`}>
            <SvgIcon name="sparkle" />
            <span className="flex-1">Asistente IA</span>
            <span className="text-[9px] text-gold/50 border border-gold/20 px-1.5 py-0.5 rounded-full">IA</span>
          </Link>
        </div>
      </nav>

      <div className="p-3 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl">
          <div className="w-7 h-7 bg-gold/20 border border-gold/30 rounded-full flex items-center justify-center text-[10px] font-semibold text-gold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-white/70 truncate">{profile?.full_name || "Sin nombre"}</div>
            <div className="text-[10px] text-white/25 capitalize">{profile?.role}</div>
          </div>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); router.refresh(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
          <SvgIcon name="logout" size={13} /> Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Móvil: barra superior ──────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-navy flex items-center justify-between px-4 h-14 border-b border-white/10">
        <Link href="/admin">
          <Image src={DUCLAUD_LOGO_WHITE} alt="D.UCLAUD" width={120} height={34} className="h-7 w-auto"/>
        </Link>
        <div className="flex items-center gap-3">
          {leadsNuevos > 0 && (
            <span className="bg-gold text-navy text-[10px] font-bold px-1.5 py-0.5 rounded-full">{leadsNuevos}</span>
          )}
          <button onClick={() => setOpen(o => !o)} className="text-white/60 hover:text-white transition-colors p-1">
            <SvgIcon name={open ? "close" : "menu"} size={22}/>
          </button>
        </div>
      </div>

      {/* ── Móvil: overlay ─────────────────────────────────────────────────── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50"/>
        </div>
      )}

      {/* ── Móvil: drawer ──────────────────────────────────────────────────── */}
      <div className={`md:hidden fixed top-14 left-0 bottom-0 z-40 w-72 bg-navy flex flex-col transition-transform duration-300 ${
        open ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebarContent}
      </div>

      {/* ── Desktop: sidebar fijo ──────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 bg-navy flex-col h-screen sticky top-0">
        {sidebarContent}
      </aside>
    </>
  );
}
