// app/admin/tareas/page.tsx
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { TareasClient } from "@/components/TareasClient";

export default async function AdminTareasPage() {
  const supabase = createAdminClient();
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isAdmin = profile?.role === "admin";

  const query = supabase
    .from("tasks")
    .select(`*, assignee:profiles!assigned_to(id, full_name, initials), lead:leads(id, name)`)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (!isAdmin) query.eq("assigned_to", user!.id);

  const { data: tasks } = await query;

  const { data: profiles } = isAdmin
    ? await supabase.from("profiles").select("id, full_name").eq("active", true)
    : { data: [] };

  // KPIs
  const all        = tasks || [];
  const done       = all.filter(t => t.status === "done");
  const overdue    = all.filter(t => t.status !== "done" && t.due_at && new Date(t.due_at) < new Date());
  const dueToday   = all.filter(t => t.status !== "done" && t.due_at && new Date(t.due_at).toDateString() === new Date().toDateString());
  const compliance = all.length > 0 ? Math.round((done.length / all.length) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-5 font-dmsans">
      <div>
        <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px]">
          Tareas<em className="italic font-serif text-gold">.</em>
        </h1>
        <p className="text-[#6b7385] text-[15px] mt-1">Organización y seguimiento del equipo</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[
          { label: "Cumplimiento", value: `${compliance}%`, sub: `${done.length} de ${all.length} completadas`, color: compliance >= 75 ? "text-emerald-600" : compliance >= 50 ? "text-amber-600" : "text-red-500" },
          { label: "Vencidas",     value: overdue.length,   sub: "sin completar",           color: overdue.length > 0 ? "text-red-500" : "text-emerald-600" },
          { label: "Vencen hoy",   value: dueToday.length,  sub: "pendientes hoy",          color: dueToday.length > 0 ? "text-amber-600" : "text-[#6b7385]" },
          { label: "Total activas",value: all.filter(t => t.status !== "done").length, sub: "en progreso o pendientes", color: "text-navy" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-[28px] px-5 py-5">
            <p className="text-[11px] uppercase tracking-[1.1px] text-[#6b7385] mb-2">{k.label}</p>
            <p className={`text-[32px] font-semibold tracking-[-0.64px] ${k.color}`}>{k.value}</p>
            <p className="text-[12px] text-[#6b7385] mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <TareasClient
        tasks={all}
        profiles={profiles || []}
        currentUserId={user!.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
