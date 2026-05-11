import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LeadsClient } from "@/components/LeadsClient";

export default async function AdminLeadsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("leads")
    .select("*, agent:profiles(full_name)")
    .order("created_at", { ascending: false });
  const leads = (data || []) as any[];

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Clientes</h1>
          <p className="text-sm text-ink-muted mt-0.5">{leads.length} en seguimiento</p>
        </div>
      </div>
      <LeadsClient leads={leads} />
    </div>
  );
}
