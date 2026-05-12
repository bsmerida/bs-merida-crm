import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LeadsClient } from "@/components/LeadsClient";

export default async function AdminLeadsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isAdmin = profile?.role === "admin";

  const query = supabase
    .from("leads")
    .select("*, agent:profiles(full_name)")
    .order("created_at", { ascending: false });
  if (!isAdmin) query.eq("agent_id", user!.id);

  const { data } = await query;
  const leads = (data || []) as any[];

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Clientes</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {isAdmin ? `${leads.length} en seguimiento` : `${leads.length} clientes asignados a ti`}
          </p>
        </div>
        <Link href="/admin/leads/nuevo"
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-full text-sm font-medium">
          + Cliente
        </Link>
      </div>
      <LeadsClient leads={leads} isAdmin={isAdmin} />
    </div>
  );
}
