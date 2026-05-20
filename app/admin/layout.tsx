import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { count: leadsNuevos } = await supabase
    .from("leads").select("*", { count: "exact", head: true }).eq("status", "Nuevo");

  return (
    <div className="flex bg-cream min-h-screen">
      <AdminSidebar profile={profile} leadsNuevos={leadsNuevos || 0} />
      <main className="flex-1 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
