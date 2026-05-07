import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LeadEditor } from "@/components/LeadEditor";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: lead }, { data: agentes }, { data: activities }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", params.id).single(),
    supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name"),
    supabase.from("activities").select("*, user:profiles(full_name)").eq("lead_id", params.id).order("created_at", { ascending: false }).limit(50),
  ]);

  if (!lead) notFound();

  return (
    <div className="p-10 max-w-5xl space-y-6">
      <Link href="/admin/leads" className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-1">← Volver a clientes</Link>
      <LeadEditor lead={lead} agentes={agentes || []} activities={activities || []} />
    </div>
  );
}
