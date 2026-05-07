"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "./Icon";
import { ESTADOS_LEAD } from "@/lib/utils";

const TIPOS_ACTIVIDAD = ["llamada", "whatsapp", "email", "visita", "nota"];

export function LeadEditor({ lead, agentes, activities }: { lead: any; agentes: any[]; activities: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    name: lead.name,
    phone: lead.phone || "",
    email: lead.email || "",
    status: lead.status,
    agent_id: lead.agent_id || "",
    interest: lead.interest || "",
    budget_text: lead.budget_text || "",
    notes: lead.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [actType, setActType] = useState("nota");
  const [actDesc, setActDesc] = useState("");
  const [acts, setActs] = useState(activities);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("leads").update({
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      status: form.status,
      agent_id: form.agent_id || null,
      interest: form.interest || null,
      budget_text: form.budget_text || null,
      notes: form.notes || null,
      last_contact_at: new Date().toISOString(),
    }).eq("id", lead.id);
    setSaving(false);
    if (!error) {
      setSavedAt(new Date().toLocaleTimeString("es-MX"));
      router.refresh();
    } else {
      alert("Error: " + error.message);
    }
  };

  const addActivity = async () => {
    if (!actDesc.trim()) return;
    const { data, error } = await supabase.from("activities").insert({
      lead_id: lead.id,
      type: actType,
      description: actDesc,
    }).select("*, user:profiles(full_name)").single();
    if (!error && data) {
      setActs([data, ...acts]);
      setActDesc("");
      // También actualiza last_contact_at
      await supabase.from("leads").update({ last_contact_at: new Date().toISOString() }).eq("id", lead.id);
      router.refresh();
    }
  };

  const Field = ({ label, children }: any) => (
    <div>
      <label className="text-xs text-ink-muted">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
  const inputCls = "w-full bg-ink-ghost border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-brand-300";

  const statusColor: Record<string, string> = {
    "Nuevo": "bg-slate-100 text-slate-700",
    "Contactado": "bg-blue-50 text-blue-700",
    "Calificado": "bg-indigo-50 text-indigo-700",
    "Visita agendada": "bg-purple-50 text-purple-700",
    "Visita realizada": "bg-pink-50 text-pink-700",
    "Oferta": "bg-orange-50 text-orange-700",
    "Negociación": "bg-amber-50 text-amber-700",
    "Cerrado ganado": "bg-emerald-50 text-emerald-700",
    "Cerrado perdido": "bg-red-50 text-red-700",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna principal */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-2xl font-semibold text-ink tracking-tight">{form.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded-full ${statusColor[form.status] || "bg-ink-ghost text-ink-muted"}`}>{form.status}</span>
                <span className="text-xs text-ink-muted">Origen: {lead.source || "—"}</span>
              </div>
            </div>
            <button onClick={save} disabled={saving} className="bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-sm font-medium px-5 py-2.5 rounded-full">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
          {savedAt && <div className="text-xs text-emerald-600 mb-4">✓ Guardado a las {savedAt}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre"><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} /></Field>
            <Field label="Estado">
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>
                {ESTADOS_LEAD.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Teléfono / WhatsApp"><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputCls} /></Field>
            <Field label="Correo"><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputCls} /></Field>
            <Field label="Asesor asignado">
              <select value={form.agent_id} onChange={e => setForm({...form, agent_id: e.target.value})} className={inputCls}>
                <option value="">Sin asignar</option>
                {agentes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </Field>
            <Field label="Presupuesto"><input value={form.budget_text} onChange={e => setForm({...form, budget_text: e.target.value})} placeholder="Ej. 5-7M" className={inputCls} /></Field>
          </div>
          <div className="mt-4">
            <Field label="Interés">
              <textarea rows={2} value={form.interest} onChange={e => setForm({...form, interest: e.target.value})} className={`${inputCls} resize-none`} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Notas internas">
              <textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className={`${inputCls} resize-none`} placeholder="Solo visible para el equipo" />
            </Field>
          </div>
        </div>

        {/* Bitácora */}
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <h3 className="font-semibold text-ink mb-4">Bitácora de actividades</h3>
          <div className="flex gap-2 mb-4">
            <select value={actType} onChange={e => setActType(e.target.value)} className="bg-ink-ghost rounded-xl px-3 py-2 text-sm">
              {TIPOS_ACTIVIDAD.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={actDesc} onChange={e => setActDesc(e.target.value)} onKeyDown={e => e.key === "Enter" && addActivity()}
              placeholder="¿Qué pasó? Ej. Llamé, agendamos visita el viernes 11am" className="flex-1 bg-ink-ghost rounded-xl px-4 py-2 text-sm focus:outline-none focus:bg-white" />
            <button onClick={addActivity} className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-2 rounded-xl">Agregar</button>
          </div>
          {acts.length === 0 ? (
            <div className="text-sm text-ink-muted text-center py-6">Sin actividades. Agrega la primera arriba.</div>
          ) : (
            <div className="space-y-3">
              {acts.map(a => (
                <div key={a.id} className="flex gap-3 pb-3 border-b border-ink-line last:border-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[11px] font-semibold uppercase">{a.type.slice(0, 2)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink">{a.description}</div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {a.user?.full_name || "Sistema"} · {new Date(a.created_at).toLocaleString("es-MX")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar derecha */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <h3 className="font-semibold text-ink mb-4">Cambio rápido de estado</h3>
          <div className="space-y-2">
            {ESTADOS_LEAD.map(s => (
              <button key={s}
                onClick={() => { setForm({...form, status: s}); setTimeout(save, 100); }}
                className={`w-full text-left text-sm px-3 py-2 rounded-xl transition ${form.status === s ? "bg-brand-50 text-brand-700 font-medium" : "hover:bg-ink-ghost text-ink"}`}>
                {form.status === s && "✓ "}{s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <h3 className="font-semibold text-ink mb-3 text-sm">Acciones</h3>
          <div className="space-y-2">
            {form.phone && (
              <a href={`https://wa.me/52${form.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                 className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white text-sm py-2.5 rounded-xl">
                WhatsApp al cliente
              </a>
            )}
            {form.phone && (
              <a href={`tel:${form.phone}`} className="block w-full text-center bg-white border border-ink-line text-ink text-sm py-2.5 rounded-xl hover:border-ink-soft">
                Llamar
              </a>
            )}
            {form.email && (
              <a href={`mailto:${form.email}`} className="block w-full text-center bg-white border border-ink-line text-ink text-sm py-2.5 rounded-xl hover:border-ink-soft">
                Enviar correo
              </a>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <h3 className="font-semibold text-ink mb-3 text-sm">Información</h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-ink-muted">Recibido:</span> <span className="text-ink">{new Date(lead.created_at).toLocaleDateString("es-MX")}</span></div>
            {lead.last_contact_at && <div><span className="text-ink-muted">Último contacto:</span> <span className="text-ink">{new Date(lead.last_contact_at).toLocaleDateString("es-MX")}</span></div>}
            <div><span className="text-ink-muted">Origen:</span> <span className="text-ink">{lead.source || "—"}</span></div>
            <div><span className="text-ink-muted">ID:</span> <span className="text-ink-muted text-xs">{lead.id.slice(0, 8)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
