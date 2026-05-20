"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Home, Users, Building2, TrendingUp, Wallet,
  Globe, Settings, LogOut, Sparkles, ChevronRight
} from "lucide-react";

type Profile = { full_name: string | null; email: string | null; role: string; initials: string | null };

export function AdminSidebar({ profile, leadsNuevos }: { profile: Profile | null; leadsNuevos: number }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const isAdmin  = profile?.role === "admin";
  const initials = profile?.initials || profile?.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "D";

  const mainNav = [
    { href: "/admin",             label: "Inicio",      Icon: Home },
    { href: "/admin/leads",       label: "Clientes",    Icon: Users,     badge: leadsNuevos > 0 ? leadsNuevos : null },
    { href: "/admin/propiedades", label: "Propiedades", Icon: Building2 },
  ];
  const adminNav = [
    { href: "/admin/kpis",     label: "KPIs",     Icon: TrendingUp },
    { href: "/admin/finanzas", label: "Finanzas",  Icon: Wallet     },
    { href: "/admin/portales", label: "Portales",  Icon: Globe      },
    { href: "/admin/ajustes",  label: "Ajustes",   Icon: Settings   },
  ];

  const NavItem = ({ href, label, Icon: ItemIcon, badge }: any) => {
    const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
    return (
      <Link href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm transition-all ${
          active
            ? "bg-gold/15 text-gold font-medium"
            : "text-white/45 hover:bg-white/6 hover:text-white/80"}`}>
        <ItemIcon size={16} strokeWidth={1.75} className="shrink-0" />
        <span className="flex-1">{label}</span>
        {badge && <span className="bg-gold text-navy text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
      </Link>
    );
  };

  return (
    <aside className="w-60 bg-navy flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-white/8">
        <Link href="/admin" className="select-none">
          <span className="font-serif text-lg font-light tracking-[0.16em] text-white uppercase">
            D<span className="text-gold mx-0.5">·</span>UCLAUD
          </span>
          <p className="text-[9px] uppercase tracking-[0.12em] text-white/25 mt-0.5">Panel administrativo</p>
        </Link>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {mainNav.map(item => <NavItem key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <div className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.16em] px-3 pt-5 pb-2">
              Análisis
            </div>
            {adminNav.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}

        <div className="mt-4 pt-4 border-t border-white/8">
          <Link href="/admin/asistente"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              pathname.startsWith("/admin/asistente")
                ? "bg-gold/15 text-gold font-medium"
                : "text-gold/60 hover:bg-gold/10 hover:text-gold"}`}>
            <Sparkles size={16} strokeWidth={1.75} className="shrink-0" />
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
          <LogOut size={13} strokeWidth={1.75} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
