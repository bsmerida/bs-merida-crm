import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CitasClient } from "@/components/CitasClient";

export default async function AdminCitasPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile }  = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isAdmin = profile?.role === "admin";

  const query = supabase
    .from("appointments")
    .select(`*, property:properties(id,title,zone,city), agent:profiles(full_name)`)
    .order("starts_at", { ascending: true });

  if (!isAdmin) query.eq("agent_id", user!.id);

  const today = new Date(); today.setHours(0,0,0,0);
  query.gte("starts_at", today.toISOString());

  const { data } = await query;
  const citas = (data || []) as any[];

  return (
    <div className="p-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Citas</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          {citas.length} cita{citas.length !== 1 ? "s" : ""} próxima{citas.length !== 1 ? "s" : ""}
        </p>
      </div>
      <CitasClient citas={citas} isAdmin={isAdmin} />
    </div>
  );
}
