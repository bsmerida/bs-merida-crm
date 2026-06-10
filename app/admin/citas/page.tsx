// app/admin/citas/page.tsx
import { createClient } from "@/lib/supabase/server";
import { CitasClient } from "@/components/CitasClient";

export default async function AdminCitasPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile }  = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isAdmin = profile?.role === "admin";

  const query = supabase
    .from("appointment_requests")
    .select(`*, property:properties(id,title,zone,city), agent:profiles(full_name)`)
    .order("created_at", { ascending: false });

  if (!isAdmin) query.eq("agent_id", user!.id);

  const { data } = await query;
  const requests = (data || []) as any[];

  const pending = requests.filter(r => r.status === "pending").length;

  return (
    <div className="p-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Solicitudes de visita</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          {pending > 0
            ? `${pending} pendiente${pending>1?"s":""} de respuesta`
            : `${requests.length} solicitud${requests.length!==1?"es":""}` }
        </p>
      </div>
      <CitasClient requests={requests} isAdmin={isAdmin} />
    </div>
  );
}
