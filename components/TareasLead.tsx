// components/TareasLead.tsx
// Versión compacta del módulo de tareas para usar dentro de la ficha de un cliente
import { TareasClient } from "@/components/TareasClient";

export async function TareasLead({
  leadId, currentUserId, isAdmin, profiles,
}: {
  leadId: string;
  currentUserId: string;
  isAdmin: boolean;
  profiles: { id: string; full_name: string | null }[];
}) {
  // Este componente se usa desde un Server Component — importa createClient directo
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(`*, assignee:profiles!assigned_to(id, full_name, initials), lead:leads(id, name)`)
    .eq("lead_id", leadId)
    .order("due_at", { ascending: true, nullsFirst: false });

  return (
    <div className="space-y-4">
      <TareasClient
        tasks={tasks || []}
        profiles={profiles}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        leadId={leadId}
      />
    </div>
  );
}
