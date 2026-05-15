"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Agent    = { id: string; full_name: string };
type Lead     = { id: string; name: string };
type Property = { id: string; title: string; price: number };

const DEAL_TYPES = [
  { value: "directa",           label: "Directa — empresa se lleva todo" },
  { value: "compartida",        label: "Compartida — con otra inmobiliaria" },
  { value: "referido",          label: "Con referido externo" },
  { value: "asesor_solo",       label: "Asesor nuestro (solo)" },
  { value: "asesor_compartida", label: "Dos asesores nuestros" },
];

const fmtMXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const EMPTY = {
  lead_id: "", property_id: "", agent_id: "", agent2_id: "",
  operation_type: "venta", deal_type: "directa",
  transaction_value: "", commission_rate: "0.04",
  shared_agency_name: "", shared_pct: "0.50",
  referral_name: "", referral_pct: "0.10",
  agent_split_pct: "0.40", agent2_split_pct: "0.30",
  closing_date: new Date().toISOString().slice(0, 10),
  expected_collection_date: "", amount_collected: "",
  status: "pendiente", notes: "",
};

type FormState = typeof EMPTY;

function fromDeal(d: any): FormState {
  return {
    lead_id:                    d.lead_id     || "",
    property_id:                d.property_id || "",
    agent_id:                   d.agent_id    || "",
    agent2_id:                  d.agent2_id   || "",
    operation_type:             d.operation_type  || "venta",
    deal_type:                  d.deal_type       || "directa",
    transaction_value:          String(d.transaction_value || ""),
    commission_rate:            String(d.commission_rate   || "0.04"),
    shared_agency_name:         d.shared_agency_name || "",
    shared_pct:                 String(d.shared_pct    || "0.50"),
    referral_name:              d.referral_name || "",
    referral_pct:               String(d.referral_pct  || "0.10"),
    agent_split_pct:            String(d.agent_split_pct  || "0.40"),
    agent2_split_pct:           String(d.agent2_split_pct || "0.30"),
    closing_date:               d.closing_date              || new Date().toISOString().slice(0, 10),
    expected_collection_date:   d.expected_collection_date  || "",
    amount_collected:           String(d.amount_collected   || ""),
    status:                     d.status || "pendiente",
    notes:                      d.notes  || "",
  };
}

export function DealForm({
  onClose, onSaved, deal,
}: {
  onClose: () => void;
  onSaved: () => void;
  deal?: any; // si viene, es modo edición
}) {
  const supabase  = createClient();
  const isEditing = !!deal;
  const [saving, setSaving]       = useState(false);
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm]           = useState<FormState>(deal ? fromDeal(deal) : EMPTY);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id, full_name").eq("role", "asesor").eq("active", true),
      supabase.from("leads").select("id, name").order("created_at", { ascending: false }).limit(200),
      supabase.from("properties").select("id, title, price").eq("is_published", true).limit(300),
    ]).then(([a, l, p]) => {
      setAgents(a.data || []);
      setLeads(l.data || []);
      setProperties(p.data || []);
    });
  }, []);

  const set = (field: keyof FormState, value: string) => setForm(f => ({ ...f, [field]: value }));

  // ── Cálculos en tiempo real ─────────────────────────────────
  const tv    = Number(form.transaction_value) || 0;
  const rate  = Number(form.commission_rate)   || 0;
  const gross = tv * rate;

  // Compartida con otra inmobiliaria
  const sharedPct    = form.deal_type === "compartida" ? Number(form.shared_pct) || 0 : 0;
  const sharedAmt    = gross * sharedPct;
  const afterShared  = gross - sharedAmt; // lo que nos queda a nosotros

  // Referido
  const refPct = form.deal_type === "referido" ? Number(form.referral_pct) || 0 : 0;
  const refAmt = afterShared * refPct;

  // Asesores internos (aplican sobre lo que queda tras compartida/referido)
  const base      = afterShared - refAmt;
  const agentPct  = ["asesor_solo","asesor_compartida"].includes(form.deal_type) ? Number(form.agent_split_pct) || 0 : 0;
  const agent2Pct = form.deal_type === "asesor_compartida" ? Number(form.agent2_split_pct) || 0 : 0;
  const agentAmt  = base * agentPct;
  const agent2Amt = base * agent2Pct;

  // Ingreso real de la empresa
  const netAmt = gross - sharedAmt - refAmt - agentAmt - agent2Amt;

  const save = async () => {
    if (!form.transaction_value || !form.commission_rate || !form.closing_date) {
      alert("Completa: valor de operación, % comisión y fecha de cierre.");
      return;
    }
    setSaving(true);

    // Solo los campos base que siempre existen en la tabla deals
    const payload: any = {
      lead_id:                  form.lead_id       || null,
      property_id:              form.property_id   || null,
      agent_id:                 form.agent_id      || null,
      agent2_id:                form.agent2_id     || null,
      operation_type:           form.operation_type,
      deal_type:                form.deal_type,
      transaction_value:        tv,
      commission_rate:          rate,
      gross_commission:         gross,
      referral_name:            form.referral_name || null,
      referral_pct:             refPct,
      referral_amount:          refAmt,
      agent_split_pct:          agentPct,
      agent_commission:         agentAmt,
      agent2_split_pct:         agent2Pct,
      agent2_commission:        agent2Amt,
      net_commission:           netAmt,
      closing_date:             form.closing_date,
      expected_collection_date: form.expected_collection_date || null,
      status:                   form.status,
      notes:                    form.notes || null,
    };

    // amount_collected solo si tiene valor real
    if (form.amount_collected && Number(form.amount_collected) > 0) {
      payload.amount_collected = Number(form.amount_collected);
    }

    // Campos de comisión compartida (solo si ya corriste la migración SQL)
    if (form.deal_type === "compartida" && sharedAmt > 0) {
      payload.shared_pct         = sharedPct;
      payload.shared_amount      = sharedAmt;
      payload.shared_agency_name = form.shared_agency_name || null;
    }

    const { error } = isEditing
      ? await supabase.from("deals").update(payload).eq("id", deal.id)
      : await supabase.from("deals").insert(payload);

    setSaving(false);

    if (error) {
      // Si falla por columnas compartidas, reintentar sin ellas
      if (error.message?.includes("shared")) {
        delete payload.shared_pct;
        delete payload.shared_amount;
        delete payload.shared_agency_name;
        const { error: e2 } = isEditing
          ? await supabase.from("deals").update(payload).eq("id", deal.id)
          : await supabase.from("deals").insert(payload);
        if (e2) { alert("Error al guardar: " + e2.message); return; }
      } else {
        alert("Error al guardar: " + error.message);
        return;
      }
    }
    onSaved();

    // Avisar si la operación quedó fuera del período visible actual
    const dealDate = new Date(form.closing_date);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (dealDate < thisMonth) {
      const mes = dealDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
      alert(`✓ Operación guardada correctamente.\n\nNota: la fecha de cierre es ${mes}. Para verla en Finanzas, cambia el período a "Semestre" o "Año".`);
    }

    onClose();
  };

  const inp = "w-full bg-ink-ghost border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-brand-300";
  const pctField = (label: string, field: keyof FormState) => (
    <div>
      <label className="text-xs text-ink-muted">{label}</label>
      <div className="mt-1.5 flex gap-2 items-center">
        <input type="number" step="0.01" min="0" max="1" value={form[field]}
          onChange={e => set(field, e.target.value)} className={`${inp} flex-1`} />
        <span className="text-sm text-ink-muted w-10 text-right">{(Number(form[field]) * 100).toFixed(0)}%</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-ink-line flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-ink text-lg">
            {isEditing ? "Editar operación" : "Registrar operación"}
          </h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl">×</button>
        </div>

        <div className="p-6 space-y-5">

          {/* Tipo de operación y deal */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-muted">Tipo de operación</label>
              <div className="mt-1.5">
                <select value={form.operation_type} onChange={e => set("operation_type", e.target.value)} className={inp}>
                  <option value="venta">Venta</option>
                  <option value="renta">Renta</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-muted">Estructura del deal</label>
              <div className="mt-1.5">
                <select value={form.deal_type} onChange={e => set("deal_type", e.target.value)} className={inp}>
                  {DEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Propiedad y cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-muted">Propiedad</label>
              <div className="mt-1.5">
                <select value={form.property_id} onChange={e => {
                  const p = properties.find(x => x.id === e.target.value);
                  set("property_id", e.target.value);
                  if (p && !form.transaction_value) set("transaction_value", String(p.price));
                }} className={inp}>
                  <option value="">— Sin propiedad</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-muted">Cliente</label>
              <div className="mt-1.5">
                <select value={form.lead_id} onChange={e => set("lead_id", e.target.value)} className={inp}>
                  <option value="">— Sin cliente</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Valor y comisión */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-muted">Valor de la operación (MXN) *</label>
              <div className="mt-1.5">
                <input type="number" value={form.transaction_value}
                  onChange={e => set("transaction_value", e.target.value)}
                  placeholder="Ej. 3,500,000" className={inp} />
              </div>
            </div>
            {pctField("% Comisión bruta *", "commission_rate")}
          </div>

          {/* Compartida con otra inmobiliaria */}
          {form.deal_type === "compartida" && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Comisión compartida con otra inmobiliaria</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-muted">Nombre de la otra inmobiliaria</label>
                  <input value={form.shared_agency_name}
                    onChange={e => set("shared_agency_name", e.target.value)}
                    placeholder="Ej. Inmobiliaria XYZ" className={`${inp} mt-1.5`} />
                </div>
                {pctField("% que se lleva la otra inmobiliaria", "shared_pct")}
              </div>
              {gross > 0 && (
                <p className="text-xs text-orange-600">
                  De {fmtMXN(gross)} de comisión bruta, le corresponden {fmtMXN(sharedAmt)} a la otra inmobiliaria.
                  Nos quedan <strong>{fmtMXN(afterShared)}</strong>.
                </p>
              )}
            </div>
          )}

          {/* Referido */}
          {form.deal_type === "referido" && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Referido externo</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-muted">Nombre del referido</label>
                  <input value={form.referral_name}
                    onChange={e => set("referral_name", e.target.value)}
                    placeholder="Ej. Carlos García" className={`${inp} mt-1.5`} />
                </div>
                {pctField("% Comisión referido", "referral_pct")}
              </div>
            </div>
          )}

          {/* Asesores internos */}
          {["asesor_solo", "asesor_compartida"].includes(form.deal_type) && (
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Asesor(es) interno(s)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-muted">Asesor principal</label>
                  <select value={form.agent_id} onChange={e => set("agent_id", e.target.value)} className={`${inp} mt-1.5`}>
                    <option value="">— Seleccionar</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
                {pctField("% Comisión asesor principal", "agent_split_pct")}
              </div>
              {form.deal_type === "asesor_compartida" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-ink-muted">Segundo asesor</label>
                    <select value={form.agent2_id} onChange={e => set("agent2_id", e.target.value)} className={`${inp} mt-1.5`}>
                      <option value="">— Seleccionar</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                    </select>
                  </div>
                  {pctField("% Comisión segundo asesor", "agent2_split_pct")}
                </div>
              )}
            </div>
          )}

          {/* Desglose de comisión en tiempo real */}
          {tv > 0 && (
            <div className="bg-ink-ghost rounded-2xl p-4">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Desglose de la comisión</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Valor de la operación</span>
                  <span className="font-medium text-ink">{fmtMXN(tv)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-ink-line pt-2">
                  <span className="text-ink-muted">Comisión bruta ({(rate * 100).toFixed(1)}%)</span>
                  <span className="font-medium text-ink">{fmtMXN(gross)}</span>
                </div>
                {sharedAmt > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>− Otra inmobiliaria {form.shared_agency_name ? `(${form.shared_agency_name})` : ""} ({(sharedPct * 100).toFixed(0)}%)</span>
                    <span>− {fmtMXN(sharedAmt)}</span>
                  </div>
                )}
                {refAmt > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>− Referido {form.referral_name ? `(${form.referral_name})` : ""} ({(refPct * 100).toFixed(0)}%)</span>
                    <span>− {fmtMXN(refAmt)}</span>
                  </div>
                )}
                {agentAmt > 0 && (
                  <div className="flex justify-between text-sm text-brand-600">
                    <span>− Asesor principal ({(agentPct * 100).toFixed(0)}%)</span>
                    <span>− {fmtMXN(agentAmt)}</span>
                  </div>
                )}
                {agent2Amt > 0 && (
                  <div className="flex justify-between text-sm text-brand-600">
                    <span>− Segundo asesor ({(agent2Pct * 100).toFixed(0)}%)</span>
                    <span>− {fmtMXN(agent2Amt)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold border-t border-ink-line pt-2">
                  <span className="text-ink">Ingreso neto de la empresa</span>
                  <span className={netAmt >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtMXN(netAmt)}</span>
                </div>
                {gross > 0 && (
                  <p className="text-[11px] text-ink-muted text-right">
                    Margen real: {((netAmt / tv) * 100).toFixed(2)}% sobre el valor de la operación
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Fechas, cobro y estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-muted">Fecha de cierre *</label>
              <input type="date" value={form.closing_date}
                onChange={e => set("closing_date", e.target.value)} className={`${inp} mt-1.5`} />
            </div>
            <div>
              <label className="text-xs text-ink-muted">Fecha esperada de cobro</label>
              <input type="date" value={form.expected_collection_date}
                onChange={e => set("expected_collection_date", e.target.value)} className={`${inp} mt-1.5`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-muted">Estado de cobro</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className={`${inp} mt-1.5`}>
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Cobro parcial</option>
                <option value="cobrado">Cobrado completo</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            {(form.status === "parcial" || form.status === "cobrado") && (
              <div>
                <label className="text-xs text-ink-muted">Monto cobrado hasta ahora</label>
                <input type="number" value={form.amount_collected}
                  onChange={e => set("amount_collected", e.target.value)}
                  placeholder={fmtMXN(gross)} className={`${inp} mt-1.5`} />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-ink-muted">Notas</label>
            <textarea rows={2} value={form.notes}
              onChange={e => set("notes", e.target.value)} className={`${inp} resize-none mt-1.5`} />
          </div>
        </div>

        <div className="p-6 border-t border-ink-line flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-5 py-2.5 border border-ink-line text-ink rounded-full text-sm hover:bg-ink-ghost">
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-full text-sm font-medium">
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Registrar operación"}
          </button>
        </div>
      </div>
    </div>
  );
}
