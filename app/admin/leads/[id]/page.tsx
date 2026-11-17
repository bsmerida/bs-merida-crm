import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { canManage, getAuth } from "@/lib/auth";
import { LeadEditor } from "@/components/LeadEditor";
import { LeadTablero } from "@/components/LeadTablero";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const [{ data: lead }, { data: agentes }, { data: activities }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", params.id).single(),
    supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name"),
    supabase.from("activities").select("*, user:profiles(full_name)").eq("lead_id", params.id).order("created_at", { ascending: false }).limit(50),
  ]);

  // Con service role no aplica RLS: el asesor solo puede abrir sus propios clientes
  const auth = await getAuth();
  if (!lead || !auth || !canManage(auth, lead.agent_id)) notFound();

  return (
    <div className="p-4 md:p-6 max-w-5xl space-y-8">
      <Link href="/admin/leads" className="text-sm text-[#6b7385] hover:text-navy inline-flex items-center gap-1">← Volver a clientes</Link>
      <LeadEditor lead={lead} agentes={agentes || []} activities={activities || []} />

      <div className="space-y-4">
        <div>
          <h2 className="font-serif text-navy text-[28px]">Tablero de propiedades</h2>
          <p className="text-[#6b7385] text-[15px] mt-0.5">Selección personalizada para compartir con el cliente</p>
        </div>
        <LeadTablero lead={lead} />
      </div>
    </div>
  );
}
