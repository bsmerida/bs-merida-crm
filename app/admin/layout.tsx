import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/AdminSidebar";
import { PushPermission } from "@/components/PushPermission";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count: leadsNuevos }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, role, initials, active").eq("id", user.id).single(),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "Nuevo"),
  ]);
  // Usuario desactivado desde Ajustes → Equipo: ya no entra al CRM
  if (profile && profile.active === false) redirect("/api/auth/signout?disabled=1");

  return (
    <div className="bg-cream min-h-screen md:flex">
      <AdminSidebar profile={profile} leadsNuevos={leadsNuevos || 0} />
      <main className="flex-1 min-h-screen overflow-x-hidden pt-14 md:pt-0">
        <PushPermission />
        {children}
      </main>
    </div>
  );
}

