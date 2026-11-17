// app/admin/citas/page.tsx
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { CitasClient } from "@/components/CitasClient";

export default async function AdminCitasPage() {
  const supabase = createAdminClient();
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
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
    <div className="p-4 md:p-6 space-y-5 font-dmsans">
      <div>
        <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px]">
          Citas<em className="italic font-serif text-gold">.</em>
        </h1>
        <p className="text-[#6b7385] text-[15px] mt-1">
          {pending > 0
            ? `${pending} pendiente${pending>1?"s":""} de respuesta`
            : `${requests.length} solicitud${requests.length!==1?"es":""}` }
        </p>
      </div>
      <CitasClient requests={requests} isAdmin={isAdmin} />
    </div>
  );
}
