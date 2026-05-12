import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LeadEditor } from "@/components/LeadEditor";

export default async function NuevoLeadPage() {
  const supabase = createClient();
  const { data: agentes } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("active", true)
    .order("full_name");

  // Lead vacío con valores por defecto
  const emptyLead = {
    id: null,
    name: "",
    phone: "",
    email: "",
    status: "Nuevo",
    agent_id: null,
    interest: "",
    budget_text: "",
    budget_min: null,
    budget_max: null,
    notes: "",
    age: null,
    gender: null,
    client_city: null,
    client_state: null,
    source: "Manual",
    utm_data: null,
    created_at: new Date().toISOString(),
    last_contact_at: null,
  };

  return (
    <div className="p-10 max-w-5xl space-y-6">
      <Link href="/admin/leads" className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-1">
        ← Volver a clientes
      </Link>
      <LeadEditor lead={emptyLead} agentes={agentes || []} activities={[]} isNew />
    </div>
  );
}
