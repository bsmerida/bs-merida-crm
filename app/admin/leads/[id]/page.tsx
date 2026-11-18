import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { canManage, getAuth } from "@/lib/auth";
import { LeadProfile } from "@/components/LeadProfile";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const [{ data: lead }, { data: agentes }, { data: activities }, { data: tasks }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", params.id).single(),
    supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name"),
    supabase.from("activities").select("*, user:profiles(full_name)").eq("lead_id", params.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("tasks").select("id, title, status, priority, due_at").eq("lead_id", params.id).order("due_at", { ascending: true, nullsFirst: false }),
  ]);

  // Con service role no aplica RLS: el asesor solo puede abrir sus propios clientes
  const auth = await getAuth();
  if (!lead || !auth || !canManage(auth, lead.agent_id)) notFound();

  return (
    <div className="p-4 md:p-6 max-w-6xl space-y-4">
      <Link href="/admin/leads" className="text-sm text-[#6b7385] hover:text-navy inline-flex items-center gap-1">← Volver a clientes</Link>
      <LeadProfile
        lead={lead}
        agentes={agentes || []}
        activities={activities || []}
        tasks={tasks || []}
        currentUserId={auth.userId}
      />
    </div>
  );
}
