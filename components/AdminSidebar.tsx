"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { createClient } from "@/lib/supabase/client";

type Profile = { full_name: string | null; email: string | null; role: string; initials: string | null };

export function AdminSidebar({ profile, leadsNuevos }: { profile: Profile | null; leadsNuevos: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isAdmin = profile?.role === "admin";

  // Items visibles para todos
  const commonItems = [
    { href: "/admin", label: "Inicio", icon: "home" },
    { href: "/admin/leads", label: "Clientes", icon: "users", badge: leadsNuevos > 0 ? leadsNuevos : null },
    { href: "/admin/propiedades", label: "Propiedades", icon: "building" },
  ];

  // Items solo para admin
  const adminItems = [
    { href: "/admin/kpis", label: "KPIs", icon: "chart" },
    { href: "/admin/portales", label: "Portales", icon: "globe" },
    { href: "/admin/branding", label: "Marca", icon: "spark" },
    { href: "/admin/ajustes", label: "Ajustes", icon: "settings" },
  ];

  const items = isAdmin ? [...commonItems, ...adminItems] : commonItems;

  const initials = profile?.initials || profile?.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "BS";

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-60 bg-white border-r border-ink-line flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-ink-line">
        <Logo className="h-12" />
      </div>
      <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-thin">
        {items.map(it => {
          const active = pathname === it.href || (it.href !== "/admin" && pathname.startsWith(it.href));
          return (
            <Link key={it.href} href={it.href}
              className={`w-full flex items-center gap-3 px-3 py-2 my-0.5 text-sm rounded-lg transition ${
                active ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-muted hover:bg-ink-ghost hover:text-ink"
              }`}>
              <Icon name={it.icon} className="w-[18px] h-[18px]" />
              <span className="flex-1">{it.label}</span>
              {it.badge ? (
                <span className="bg-brand-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-medium">{it.badge}</span>
              ) : null}
            </Link>
          );
        })}

        {/* Separador y label de rol para admin */}
        {isAdmin && (
          <div className="mt-4 px-3 py-1">
            <div className="text-[10px] font-semibold text-ink-soft uppercase tracking-wider">Administración</div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-ink-line">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold uppercase">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink truncate">{profile?.full_name || "Sin nombre"}</div>
            <div className="text-xs text-ink-muted capitalize">{profile?.role || ""}</div>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink-muted hover:bg-ink-ghost hover:text-ink rounded-lg transition">
          <Icon name="logout" className="w-3.5 h-3.5" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
