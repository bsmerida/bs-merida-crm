// app/admin/tareas/page.tsx
import { createClient } from "@/lib/supabase/server";
import { TareasClient } from "@/components/TareasClient";

export default async function AdminTareasPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Tareas</h1>
          <p className="text-sm text-ink-muted mt-0.5">Organización y seguimiento del equipo</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Cumplimiento", value: `${compliance}%`, sub: `${done.length} de ${all.length} completadas`, color: compliance >= 75 ? "text-emerald-600" : compliance >= 50 ? "text-amber-600" : "text-red-500" },
          { label: "Vencidas",     value: overdue.length,   sub: "sin completar",           color: overdue.length > 0 ? "text-red-500" : "text-emerald-600" },
          { label: "Vencen hoy",   value: dueToday.length,  sub: "pendientes hoy",          color: dueToday.length > 0 ? "text-amber-600" : "text-ink-muted" },
          { label: "Total activas",value: all.filter(t => t.status !== "done").length, sub: "en progreso o pendientes", color: "text-navy" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-stone p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">{k.label}</p>
            <p className={`text-2xl font-semibold ${k.color}`}>{k.value}</p>
            <p className="text-[11px] text-ink-muted mt-1">{k.sub}</p>
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
