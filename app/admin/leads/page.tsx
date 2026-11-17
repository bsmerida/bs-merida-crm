import Link from "next/link";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { LeadsClient } from "@/components/LeadsClient";

export default async function AdminLeadsPage() {
  const supabase = createAdminClient();
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
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
    <div className="p-4 md:p-6 space-y-5 font-dmsans">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px]">
            Clientes<em className="italic font-serif text-gold">.</em>
          </h1>
          <p className="text-[#6b7385] text-[15px] mt-1">
            {isAdmin ? `${leads.length} en seguimiento` : `${leads.length} clientes asignados a ti`}
          </p>
        </div>
        <Link href="/admin/leads/nuevo"
          className="bg-navy hover:bg-navy-mid text-white font-semibold text-sm px-[22px] py-3 rounded-full transition-colors">
          Nuevo cliente
        </Link>
      </div>
      <LeadsClient leads={leads} isAdmin={isAdmin} />
    </div>
  );
}
