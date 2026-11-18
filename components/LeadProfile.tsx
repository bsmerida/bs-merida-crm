"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtMXN } from "@/lib/utils";
import { LeadEditor } from "@/components/LeadEditor";
import { LeadTablero } from "@/components/LeadTablero";

type Task = {
  id: string; title: string; status: "todo" | "in_progress" | "done";
  priority: "low" | "normal" | "high" | "urgent"; due_at: string | null;
};

const PRIORITY_CLS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700", high: "bg-amber-100 text-amber-700",
  normal: "bg-blue-50 text-blue-600", low: "bg-stone text-[#6b7385]",
};
const PRIORITY_LABEL: Record<string, string> = { urgent: "Urgente", high: "Alta", normal: "Normal", low: "Baja" };

function fechaActividad(iso: string) {
  const d = new Date(iso);
  const hoyYmd = new Date().toDateString();
  const ayer = new Date(Date.now() - 86_400_000).toDateString();
  const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoyYmd) return `Hoy · ${hora}`;
  if (d.toDateString() === ayer) return `Ayer · ${hora}`;
  return `${d.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} · ${hora}`;
}

function fechaTarea(ymd: string) {
  const hoy = new Date().toISOString().slice(0, 10);
  const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (ymd === hoy) return "Hoy";
  if (ymd === manana) return "Mañana";
  return new Date(ymd + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function LeadNotesCard({ leadId, initialNotes }: { leadId: string; initialNotes: string | null }) {
  const supabase = createClient();
  const [notes, setNotes] = useState(initialNotes || "");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const addNote = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const stamp = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    const nuevo = notes ? `${notes}\n[${stamp}] ${draft.trim()}` : `[${stamp}] ${draft.trim()}`;
    const { error } = await supabase.from("leads").update({ notes: nuevo }).eq("id", leadId);
    if (!error) { setNotes(nuevo); setDraft(""); }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-[28px] shadow-float p-6 space-y-3">
      <h3 className="font-serif text-navy text-[28px]">Notas</h3>
      {notes
        ? <p className="text-sm text-navy whitespace-pre-wrap leading-relaxed">{notes}</p>
        : <p className="text-sm text-[#6b7385]">Sin notas todavía.</p>}
      <div className="flex gap-2 pt-1">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addNote()}
          placeholder="Agregar una nota..."
          className="flex-1 bg-stone rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-[#6b7385]/60 focus:outline-none focus:bg-white" />
        <button onClick={addNote} disabled={saving || !draft.trim()}
          className="px-4 py-2.5 bg-navy hover:bg-navy-mid disabled:opacity-40 text-white rounded-xl text-sm font-medium transition">
          {saving ? "..." : "Agregar"}
        </button>
      </div>
    </div>
  );
}

function LeadTareasCard({ leadId, initialTasks, currentUserId }: { leadId: string; initialTasks: Task[]; currentUserId: string }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const addTask = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tareas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), lead_id: leadId, due_at: dueAt || null, assigned_to: currentUserId, priority: "normal" }),
    });
    const data = await res.json();
    if (data.task) { setTasks(prev => [...prev, data.task]); setTitle(""); setDueAt(""); }
    setSaving(false);
  };

  const toggleDone = async (t: Task) => {
    const status = t.status === "done" ? "todo" : "done";
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status } : x));
    await fetch(`/api/tareas/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
  };

  return (
    <div className="bg-white rounded-[28px] shadow-float p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-navy text-[28px]">Tareas</h3>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-[#6b7385] mb-4">Sin tareas para este cliente.</p>
      ) : (
        <div className="space-y-1 mb-4">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-2">
              <button onClick={() => toggleDone(t)}
                className={`w-5 h-5 rounded-full border-2 shrink-0 transition ${t.status === "done" ? "bg-navy border-navy" : "border-stone-dk"}`} />
              <span className={`flex-1 text-sm ${t.status === "done" ? "text-[#6b7385] line-through" : "text-navy"}`}>{t.title}</span>
              {t.due_at && <span className="text-xs text-[#6b7385] shrink-0">{fechaTarea(t.due_at)}</span>}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_CLS[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTask()}
          placeholder="Nueva tarea..."
          className="flex-1 bg-stone rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-[#6b7385]/60 focus:outline-none focus:bg-white" />
        <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}
          className="bg-stone rounded-xl px-3 py-2.5 text-sm text-navy focus:outline-none focus:bg-white" />
        <button onClick={addTask} disabled={saving || !title.trim()}
          className="px-4 py-2.5 bg-navy hover:bg-navy-mid disabled:opacity-40 text-white rounded-xl text-sm font-medium transition">
          {saving ? "..." : "+ Nueva"}
        </button>
      </div>
    </div>
  );
}

export function LeadProfile({ lead, agentes, activities, tasks, currentUserId }: {
  lead: any; agentes: any[]; activities: any[]; tasks: Task[]; currentUserId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const agenteNombre = agentes.find(a => a.id === lead.agent_id)?.full_name || "Sin asignar";
  const tipos: string[] = lead.search_types || [];
  const zonas: any[] = lead.preferences?.zones || [];
  const sinPreferencias = tipos.length === 0 && zonas.length === 0 && !lead.budget_text && !lead.budget_max;

  return (
    <div className="space-y-5">
      {/* Barra superior */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px]">
            {lead.name}<em className="italic font-serif text-gold">.</em>
          </h1>
          <p className="text-[#6b7385] text-[15px] mt-1">
            Cliente desde el {new Date(lead.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long" })} · {lead.source || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditOpen(true)}
            className="px-5 py-2.5 bg-white shadow-float text-navy rounded-full text-sm font-medium hover:bg-cream transition-colors">
            Editar
          </button>
        </div>
      </div>

      {/* Acciones de contacto */}
      <div className="flex flex-wrap gap-2">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="px-4 py-2 bg-white shadow-float rounded-full text-sm text-navy hover:bg-cream transition-colors">Llamar</a>
        )}
        {lead.phone && (
          <a href={`https://wa.me/52${lead.phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-white shadow-float rounded-full text-sm text-navy hover:bg-cream transition-colors">WhatsApp</a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="px-4 py-2 bg-white shadow-float rounded-full text-sm text-navy hover:bg-cream transition-colors">Correo</a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda */}
        <div className="space-y-6">
          <div className="bg-white rounded-[28px] shadow-float p-6 space-y-3">
            <h3 className="font-serif text-navy text-[28px] mb-1">Contacto</h3>
            <div><p className="text-xs text-[#6b7385] uppercase tracking-wide">Teléfono</p><p className="text-navy mt-0.5">{lead.phone || "—"}</p></div>
            <div><p className="text-xs text-[#6b7385] uppercase tracking-wide">Correo</p><p className="text-navy mt-0.5">{lead.email || "—"}</p></div>
            <div><p className="text-xs text-[#6b7385] uppercase tracking-wide">Asesor</p><p className="text-navy mt-0.5">{agenteNombre}</p></div>
            <div>
              <p className="text-xs text-[#6b7385] uppercase tracking-wide">Origen</p>
              <p className="text-navy mt-0.5">{lead.source || "—"}{lead.interest ? ` · ${lead.interest}` : ""}</p>
            </div>
          </div>

          <div className="bg-white rounded-[28px] shadow-float p-6">
            <h3 className="font-serif text-navy text-[28px] mb-3">Preferencias</h3>
            {sinPreferencias ? (
              <p className="text-sm text-[#6b7385]">Sin preferencias registradas.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tipos.map(t => <span key={t} className="bg-stone text-navy text-sm px-3 py-1.5 rounded-full">{t}</span>)}
                {zonas.map((z: any) => <span key={z.label || z.name} className="bg-stone text-navy text-sm px-3 py-1.5 rounded-full">{z.label || z.name}</span>)}
                {lead.budget_text
                  ? <span className="bg-stone text-navy text-sm px-3 py-1.5 rounded-full">{lead.budget_text}</span>
                  : lead.budget_max && <span className="bg-stone text-navy text-sm px-3 py-1.5 rounded-full">Hasta {fmtMXN(lead.budget_max)}</span>}
              </div>
            )}
          </div>

          <LeadNotesCard leadId={lead.id} initialNotes={lead.notes} />
        </div>

        {/* Columna derecha */}
        <div className="lg:col-span-2 space-y-6">
          <LeadTablero lead={lead} />

          <div className="bg-white rounded-[28px] shadow-float p-6">
            <h3 className="font-serif text-navy text-[28px] mb-4">Actividad</h3>
            {activities.length === 0 ? (
              <p className="text-sm text-[#6b7385]">Sin actividad registrada.</p>
            ) : (
              <div className="space-y-4">
                {activities.map((a: any) => (
                  <div key={a.id} className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gold font-medium">{fechaActividad(a.created_at)}</p>
                      <p className="text-sm text-navy">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <LeadTareasCard leadId={lead.id} initialTasks={tasks} currentUserId={currentUserId} />
        </div>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto p-4" onClick={() => setEditOpen(false)}>
          <div className="bg-cream rounded-[28px] max-w-5xl mx-auto my-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end p-3">
              <button onClick={() => setEditOpen(false)} className="text-[#6b7385] hover:text-navy p-2 rounded-full hover:bg-white transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-4 md:p-6 pt-0">
              <LeadEditor lead={lead} agentes={agentes} activities={activities} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
