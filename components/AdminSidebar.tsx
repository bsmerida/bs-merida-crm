"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { createClient } from "@/lib/supabase/client";

type Profile = { full_name: string | null; email: string | null; role: string; initials: string | null };

export function AdminSidebar({ profile, leadsNuevos }: { profile: Profile | null; leadsNuevos: number }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();
  const isAdmin   = profile?.role === "admin";

  type NavItem = { href: string; label: string; icon: string; badge?: number | null; ai?: boolean };

  const commonItems: NavItem[] = [
    { href: "/admin",            label: "Inicio",      icon: "home" },
    { href: "/admin/leads",      label: "Clientes",    icon: "users", badge: leadsNuevos > 0 ? leadsNuevos : null },
    { href: "/admin/propiedades",label: "Propiedades", icon: "building" },
  ];

  const adminItems: NavItem[] = [
    { href: "/admin/kpis",     label: "KPIs",          icon: "chart" },
    { href: "/admin/finanzas", label: "Finanzas",       icon: "dollar" },
    { href: "/admin/portales", label: "Portales",       icon: "globe" },
    { href: "/admin/branding", label: "Marca",          icon: "spark" },
    { href: "/admin/ajustes",  label: "Ajustes",        icon: "settings" },
  ];

  const items: NavItem[] = isAdmin ? [...commonItems, ...adminItems] : commonItems;
  const initials = profile?.initials || profile?.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "D";

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-60 bg-navy flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/8">
        <Link href="/admin" className="select-none">
          <span className="font-serif text-lg font-light tracking-[0.16em] text-white uppercase">
            D<span className="text-gold mx-0.5">·</span>UCLAUD
          </span>
          <p className="text-[9px] uppercase tracking-[0.14em] text-white/25 mt-0.5">Panel administrativo</p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {/* Sección principal */}
        <div className="mb-1">
          {commonItems.map(it => {
            const active = pathname === it.href || (it.href !== "/admin" && pathname.startsWith(it.href));
            return (
              <Link key={it.href} href={it.href}
                className={`w-full flex items-center gap-3 px-3 py-2 my-0.5 text-[13px] transition-colors ${
                  active ? "bg-gold/15 text-gold" : "text-white/45 hover:bg-white/5 hover:text-white/75"}`}>
                <Icon name={it.icon} className="w-[17px] h-[17px]" />
                <span className="flex-1">{it.label}</span>
                {it.badge ? (
                  <span className="bg-gold text-navy text-[10px] font-bold px-1.5 py-0.5 rounded-sm">{it.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </div>

        {/* Sección admin */}
        {isAdmin && (
          <>
            <div className="px-3 py-3">
              <div className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.16em]">Análisis</div>
            </div>
            {adminItems.map(it => {
              const active = pathname === it.href || pathname.startsWith(it.href);
              return (
                <Link key={it.href} href={it.href}
                  className={`w-full flex items-center gap-3 px-3 py-2 my-0.5 text-[13px] transition-colors ${
                    active ? "bg-gold/15 text-gold" : "text-white/45 hover:bg-white/5 hover:text-white/75"}`}>
                  <Icon name={it.icon} className="w-[17px] h-[17px]" />
                  <span className="flex-1">{it.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-gold/20 border border-gold/30 flex items-center justify-center text-[10px] font-medium text-gold uppercase shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-white/70 truncate">{profile?.full_name || "Sin nombre"}</div>
            <div className="text-[10px] text-white/25 capitalize">{profile?.role}</div>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
          <Icon name="logout" className="w-3.5 h-3.5" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
