"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ESTADOS_LEAD } from "@/lib/utils";

const TIPOS_ACTIVIDAD = ["llamada", "whatsapp", "email", "visita", "nota"];

const STATUS_COLORS: Record<string, string> = {
  "Nuevo":            "bg-blue-50 text-blue-700",
  "Contactado":       "bg-indigo-50 text-indigo-700",
  "Calificado":       "bg-violet-50 text-violet-700",
  "Visita agendada":  "bg-amber-50 text-amber-700",
  "Visita realizada": "bg-orange-50 text-orange-700",
  "Oferta":           "bg-pink-50 text-pink-700",
  "Negociación":      "bg-rose-50 text-rose-700",
  "Cerrado ganado":   "bg-emerald-50 text-emerald-700",
  "Cerrado perdido":  "bg-red-50 text-red-600",
};

export function LeadEditor({
  lead,
  agentes,
  activities,
  isNew = false,
}: {
  lead: any;
  agentes: any[];
  activities: any[];
  isNew?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name:         lead.name || "",
    phone:        lead.phone || "",
    email:        lead.email || "",
    status:       lead.status || "Nuevo",
    agent_id:     lead.agent_id || "",
    interest:     lead.interest || "",
    budget_text:  lead.budget_text || "",
    budget_min:   lead.budget_min?.toString() || "",
    budget_max:   lead.budget_max?.toString() || "",
    search_operation: lead.search_operation || "",
    search_type:      lead.search_type || "",
    notes:        lead.notes || "",
    age:          lead.age?.toString() || "",
    gender:       lead.gender || "",
    client_city:  lead.client_city || "",
    client_state: lead.client_state || "",
    source:       lead.source || "Manual",
  });

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [actType, setActType] = useState("nota");
  const [actDesc, setActDesc] = useState("");
  const [acts, setActs] = useState(activities);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const save = async () => {
    if (!form.name.trim()) { alert("El nombre es obligatorio."); return; }
    setSaving(true);

    const payload: any = {
      name:         form.name,
      phone:        form.phone || null,
      email:        form.email || null,
      status:       form.status,
      agent_id:     form.agent_id || null,
      interest:     form.interest || null,
      budget_text:  form.budget_text || null,
      budget_min:   form.budget_min ? Number(form.budget_min) : null,
      budget_max:   form.budget_max ? Number(form.budget_max) : null,
      search_operation: form.search_operation || null,
      search_type:      form.search_type || null,
      notes:        form.notes || null,
      age:          form.age ? Number(form.age) : null,
      gender:       form.gender || null,
      client_city:  form.client_city || null,
      client_state: form.client_state || null,
      last_contact_at: new Date().toISOString(),
    };

    if (isNew) {
      payload.source = "Manual";
      payload.consent_privacy = true;
      payload.consent_at = new Date().toISOString();
      const { data: newLead, error } = await supabase.from("leads").insert(payload).select().single();
      setSaving(false);
      if (error) { alert("Error: " + error.message); return; }
      router.push(`/admin/leads/${newLead.id}`);
      router.refresh();
    } else {
      const { error } = await supabase.from("leads").update(payload).eq("id", lead.id);
      setSaving(false);
      if (!error) { setSavedAt(new Date().toLocaleTimeString("es-MX")); router.refresh(); }
      else alert("Error: " + error.message);
    }
  };

  const addActivity = async () => {
    if (!actDesc.trim() || isNew) return;
    const { data, error } = await supabase.from("activities").insert({
      lead_id: lead.id, type: actType, description: actDesc,
    }).select("*, user:profiles(full_name)").single();
    if (!error && data) {
      setActs([data, ...acts]);
      setActDesc("");
      await supabase.from("leads").update({ last_contact_at: new Date().toISOString() }).eq("id", lead.id);
      router.refresh();
    }
  };

  const inp = "w-full bg-ink-ghost border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-brand-300";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna principal */}
      <div className="lg:col-span-2 space-y-6">

        {/* Info principal */}
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-ink tracking-tight">
                {isNew ? "Nuevo cliente" : form.name || "Cliente"}
              </h1>
              {!isNew && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[form.status] || "bg-ink-ghost text-ink-muted"}`}>
                    {form.status}
                  </span>
                  <span className="text-xs text-ink-muted">Origen: {lead.source || "—"}</span>
                  {lead.utm_data && (
                    <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                      📊 {lead.utm_data.utm_source || lead.utm_data.ref || "UTM"}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button onClick={save} disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-sm font-medium px-5 py-2.5 rounded-full">
              {saving ? "Guardando..." : isNew ? "Crear cliente" : "Guardar cambios"}
            </button>
          </div>
          {savedAt && <div className="text-xs text-emerald-600 mb-4">✓ Guardado a las {savedAt}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-ink-muted">Nombre *</label><div className="mt-1.5"><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nombre completo" className={inp} /></div></div>
            <div><label className="text-xs text-ink-muted">Estado</label><div className="mt-1.5">
              <select value={form.status} onChange={e => set("status", e.target.value)} className={inp}>
                {ESTADOS_LEAD.map(s => <option key={s}>{s}</option>)}
              </select>
            </div></div>
            <div><label className="text-xs text-ink-muted">Teléfono / WhatsApp</label><div className="mt-1.5"><input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Ej. 9991234567" className={inp} /></div></div>
            <div><label className="text-xs text-ink-muted">Correo</label><div className="mt-1.5"><input value={form.email} onChange={e => set("email", e.target.value)} placeholder="correo@ejemplo.com" className={inp} /></div></div>
            <div><label className="text-xs text-ink-muted">Asesor asignado</label><div className="mt-1.5">
              <select value={form.agent_id} onChange={e => set("agent_id", e.target.value)} className={inp}>
                <option value="">Sin asignar</option>
                {agentes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div></div>
            <div><label className="text-xs text-ink-muted">Origen</label><div className="mt-1.5">
              <select value={form.source} onChange={e => set("source", e.target.value)} className={inp}>
                <option value="Manual">Manual</option>
                <option value="Referido">Referido</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="Google">Google</option>
                <option value="Inmuebles24">Inmuebles24</option>
                <option value="Lamudi">Lamudi</option>
                <option value="Portal inmobiliario">Portal inmobiliario</option>
                <option value="WhatsApp directo">WhatsApp directo</option>
                <option value="Chatbot IA">Chatbot IA</option>
                <option value="Otro">Otro</option>
              </select>
            </div></div>
            <div><label className="text-xs text-ink-muted">Presupuesto (texto)</label><div className="mt-1.5"><input value={form.budget_text} onChange={e => set("budget_text", e.target.value)} placeholder="Ej. 3-5M" className={inp} /></div></div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><label className="text-xs text-ink-muted">Presupuesto mínimo (MXN)</label><div className="mt-1.5"><input type="number" value={form.budget_min} onChange={e => set("budget_min", e.target.value)} placeholder="Ej. 2000000" className={inp} /></div></div>
            <div><label className="text-xs text-ink-muted">Presupuesto máximo (MXN)</label><div className="mt-1.5"><input type="number" value={form.budget_max} onChange={e => set("budget_max", e.target.value)} placeholder="Ej. 5000000" className={inp} /></div></div>
          </div>

          <div className="mt-4">
            <label className="text-xs text-ink-muted">Operación buscada</label>
            <div className="flex gap-2 mt-1.5">
              {["Comprar", "Rentar"].map(op => (
                <button key={op} type="button" onClick={() => set("search_operation", form.search_operation === op ? "" : op)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${form.search_operation === op ? "bg-brand-500 text-white border-brand-500" : "bg-ink-ghost border-transparent text-ink hover:border-brand-300"}`}>
                  {op === "Comprar" ? "🏠 Comprar" : "🔑 Rentar"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs text-ink-muted">Tipo de inmueble</label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {["Casa", "Departamento", "Terreno", "Local", "Oficina", "Bodega"].map(t => (
                <button key={t} type="button" onClick={() => set("search_type", form.search_type === t ? "" : t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${form.search_type === t ? "bg-brand-500 text-white border-brand-500" : "bg-ink-ghost border-transparent text-ink hover:border-brand-300"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs text-ink-muted">Interés</label>
            <div className="mt-1.5"><textarea rows={2} value={form.interest} onChange={e => set("interest", e.target.value)} placeholder="Ej. Casa en Cholul, 3 recámaras, presupuesto 3M" className={`${inp} resize-none`} /></div>
          </div>
          <div className="mt-4">
            <label className="text-xs text-ink-muted">Notas internas</label>
            <div className="mt-1.5"><textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Solo visible para el equipo" className={`${inp} resize-none`} /></div>
          </div>
        </div>

        {/* Perfil */}
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-ink">Perfil del cliente</h3>
            <span className="text-[10px] text-ink-muted bg-ink-ghost px-2 py-0.5 rounded-full">Opcional · para estadísticas</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="text-xs text-ink-muted">Edad</label><div className="mt-1.5">
              <input type="number" min="18" max="99" value={form.age} onChange={e => set("age", e.target.value)} placeholder="Ej. 34" className={inp} />
            </div></div>
            <div><label className="text-xs text-ink-muted">Género</label><div className="mt-1.5">
              <select value={form.gender} onChange={e => set("gender", e.target.value)} className={inp}>
                <option value="">— Sin especificar</option>
                <option>Hombre</option><option>Mujer</option><option>Otro</option>
              </select>
            </div></div>
            <div><label className="text-xs text-ink-muted">Ciudad</label><div className="mt-1.5">
              <input value={form.client_city} onChange={e => set("client_city", e.target.value)} placeholder="Ej. Monterrey" className={inp} />
            </div></div>
            <div><label className="text-xs text-ink-muted">Estado</label><div className="mt-1.5">
              <input value={form.client_state} onChange={e => set("client_state", e.target.value)} placeholder="Ej. Nuevo León" className={inp} />
            </div></div>
          </div>
        </div>

        {/* Bitácora — solo en edición */}
        {!isNew && (
          <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
            <h3 className="font-semibold text-ink mb-4">Bitácora de actividades</h3>
            <div className="flex gap-2 mb-4 flex-wrap">
              <select value={actType} onChange={e => setActType(e.target.value)} className="bg-ink-ghost rounded-xl px-3 py-2 text-sm focus:outline-none">
                {TIPOS_ACTIVIDAD.map(t => <option key={t}>{t}</option>)}
              </select>
              <input value={actDesc} onChange={e => setActDesc(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addActivity()}
                placeholder="¿Qué pasó? Ej. Llamé, agendamos visita el viernes"
                className="flex-1 bg-ink-ghost rounded-xl px-4 py-2 text-sm focus:outline-none focus:bg-white min-w-[200px]" />
              <button onClick={addActivity} className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-2 rounded-xl">Agregar</button>
            </div>
            {acts.length === 0 ? (
              <div className="text-sm text-ink-muted text-center py-6">Sin actividades. Agrega la primera arriba.</div>
            ) : (
              <div className="space-y-3">
                {acts.map((a: any) => (
                  <div key={a.id} className="flex gap-3 pb-3 border-b border-ink-line last:border-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-[11px] font-semibold uppercase">
                      {a.type.slice(0, 2)}
                    </div>
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
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Cambio rápido de estado */}
        {!isNew && (
          <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
            <h3 className="font-semibold text-ink mb-4">Cambio rápido de estado</h3>
            <div className="space-y-1.5">
              {ESTADOS_LEAD.map(s => (
                <button key={s}
                  onClick={() => { set("status", s); setTimeout(save, 100); }}
                  className={`w-full text-left text-sm px-3 py-2.5 rounded-xl transition flex items-center gap-2 ${
                    form.status === s
                      ? `${STATUS_COLORS[s] || "bg-brand-50 text-brand-700"} font-medium`
                      : "text-ink-muted hover:bg-ink-ghost hover:text-ink"
                  }`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${form.status === s ? "bg-current opacity-60" : "bg-ink-line"}`}></span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info del registro */}
        {!isNew && (
          <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-3">
            <h3 className="font-semibold text-ink mb-1">Datos del registro</h3>
            <div className="text-xs text-ink-muted space-y-2">
              <div className="flex justify-between"><span>Origen</span><span className="text-ink font-medium">{lead.source || "—"}</span></div>
              <div className="flex justify-between"><span>Registrado</span><span className="text-ink">{new Date(lead.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span></div>
              <div className="flex justify-between"><span>Último contacto</span><span className="text-ink">{lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString("es-MX") : "—"}</span></div>
              {lead.utm_data && Object.keys(lead.utm_data).length > 0 && (
                <div className="pt-2 border-t border-ink-line">
                  <div className="font-medium text-ink mb-1">Campaña de origen</div>
                  {Object.entries(lead.utm_data).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k.replace("utm_", "")}</span>
                      <span className="text-ink">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ayuda para nuevo cliente */}
        {isNew && (
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
            <div className="text-sm font-semibold text-brand-800 mb-2">💡 Nuevo cliente manual</div>
            <div className="text-xs text-brand-700 space-y-1">
              <div>• Solo el nombre es obligatorio</div>
              <div>• Al crear, podrás agregar actividades y cambiar el estado</div>
              <div>• El origen quedará registrado como "Manual"</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
