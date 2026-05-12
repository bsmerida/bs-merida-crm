"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Agent = { id: string; full_name: string };
type Lead = { id: string; name: string };
type Property = { id: string; title: string; price: number };

const DEAL_TYPES = [
  { value: "directa",          label: "Directa (empresa se lleva todo)" },
  { value: "compartida",       label: "Compartida (con otra inmobiliaria)" },
  { value: "referido",         label: "Con referido externo" },
  { value: "asesor_solo",      label: "Asesor nuestro (solo)" },
  { value: "asesor_compartida",label: "Asesor nuestro (compartida)" },
];

export function DealForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [form, setForm] = useState({
    lead_id: "",
    property_id: "",
    agent_id: "",
    agent2_id: "",
    operation_type: "venta",
    deal_type: "directa",
    transaction_value: "",
    commission_rate: "0.04",
    referral_pct: "0.10",
    referral_name: "",
    agent_split_pct: "0.40",
    agent2_split_pct: "0",
    closing_date: new Date().toISOString().slice(0, 10),
    expected_collection_date: "",
    status: "pendiente",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id, full_name").eq("role", "asesor").eq("active", true),
      supabase.from("leads").select("id, name").order("created_at", { ascending: false }).limit(100),
      supabase.from("properties").select("id, title, price").eq("is_published", true).limit(200),
    ]).then(([a, l, p]) => {
      setAgents(a.data || []);
      setLeads(l.data || []);
      setProperties(p.data || []);
    });
  }, []);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  // Preview de comisiones en tiempo real
  const tv = Number(form.transaction_value) || 0;
  const rate = Number(form.commission_rate) || 0;
  const gross = tv * rate;
  const refPct = form.deal_type === "referido" ? Number(form.referral_pct) : 0;
  const agentPct = ["asesor_solo", "asesor_compartida"].includes(form.deal_type) ? Number(form.agent_split_pct) : 0;
  const agent2Pct = form.deal_type === "asesor_compartida" ? Number(form.agent2_split_pct) : 0;
  const refAmt = gross * refPct;
  const agentAmt = gross * agentPct;
  const agent2Amt = gross * agent2Pct;
  const netAmt = gross - refAmt - agentAmt - agent2Amt;

  const fmtMXN = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

  const save = async () => {
    if (!form.transaction_value || !form.commission_rate || !form.closing_date) {
      alert("Completa los campos obligatorios: valor, comisión y fecha de cierre.");
      return;
    }
    setSaving(true);
    const payload: any = {
      lead_id: form.lead_id || null,
      property_id: form.property_id || null,
      agent_id: form.agent_id || null,
      agent2_id: form.agent2_id || null,
      operation_type: form.operation_type,
      deal_type: form.deal_type,
      transaction_value: Number(form.transaction_value),
      commission_rate: Number(form.commission_rate),
      gross_commission: gross,
      referral_pct: refPct,
      referral_name: form.referral_name || null,
      referral_amount: refAmt,
      agent_split_pct: agentPct,
      agent_commission: agentAmt,
      agent2_split_pct: agent2Pct,
      agent2_commission: agent2Amt,
      net_commission: netAmt,
      closing_date: form.closing_date,
      expected_collection_date: form.expected_collection_date || null,
      status: form.status,
      notes: form.notes || null,
    };

    const { error } = await supabase.from("deals").insert(payload);
    setSaving(false);
    if (error) { alert("Error: " + error.message); return; }
    onSaved();
    onClose();
  };

  const inp = "w-full bg-ink-ghost border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-brand-300";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-ink-line flex items-center justify-between">
          <h2 className="font-semibold text-ink text-lg">Registrar operación</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tipo */}
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
              <label className="text-xs text-ink-muted">Tipo de deal</label>
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

          {/* Valores económicos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-muted">Valor de la operación (MXN) *</label>
              <div className="mt-1.5">
                <input type="number" value={form.transaction_value} onChange={e => set("transaction_value", e.target.value)}
                  placeholder="Ej. 3500000" className={inp} />
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-muted">% Comisión empresa *</label>
              <div className="mt-1.5 flex gap-2 items-center">
                <input type="number" step="0.01" min="0" max="1" value={form.commission_rate}
                  onChange={e => set("commission_rate", e.target.value)} className={`${inp} flex-1`} />
                <span className="text-sm text-ink-muted">{(Number(form.commission_rate) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Asesores */}
          {["asesor_solo", "asesor_compartida"].includes(form.deal_type) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-ink-muted">Asesor</label>
                <div className="mt-1.5">
                  <select value={form.agent_id} onChange={e => set("agent_id", e.target.value)} className={inp}>
                    <option value="">— Seleccionar</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted">% Comisión asesor</label>
                <div className="mt-1.5 flex gap-2 items-center">
                  <input type="number" step="0.01" value={form.agent_split_pct}
                    onChange={e => set("agent_split_pct", e.target.value)} className={`${inp} flex-1`} />
                  <span className="text-sm text-ink-muted">{(Number(form.agent_split_pct) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}

          {form.deal_type === "asesor_compartida" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-ink-muted">Segundo asesor</label>
                <div className="mt-1.5">
                  <select value={form.agent2_id} onChange={e => set("agent2_id", e.target.value)} className={inp}>
                    <option value="">— Seleccionar</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted">% Comisión 2° asesor</label>
                <div className="mt-1.5 flex gap-2 items-center">
                  <input type="number" step="0.01" value={form.agent2_split_pct}
                    onChange={e => set("agent2_split_pct", e.target.value)} className={`${inp} flex-1`} />
                  <span className="text-sm text-ink-muted">{(Number(form.agent2_split_pct) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Referido */}
          {form.deal_type === "referido" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-ink-muted">Nombre del referido</label>
                <div className="mt-1.5">
                  <input value={form.referral_name} onChange={e => set("referral_name", e.target.value)} className={inp} />
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted">% Comisión referido</label>
                <div className="mt-1.5 flex gap-2 items-center">
                  <input type="number" step="0.01" value={form.referral_pct}
                    onChange={e => set("referral_pct", e.target.value)} className={`${inp} flex-1`} />
                  <span className="text-sm text-ink-muted">{(Number(form.referral_pct) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Preview de distribución */}
          {tv > 0 && (
            <div className="bg-ink-ghost rounded-2xl p-4 space-y-2">
              <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Distribución de comisión</div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Valor operación</span>
                <span className="font-medium text-ink">{fmtMXN(tv)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Comisión bruta ({(rate * 100).toFixed(1)}%)</span>
                <span className="font-medium text-ink">{fmtMXN(gross)}</span>
              </div>
              {refAmt > 0 && <div className="flex justify-between text-sm text-orange-600">
                <span>— Referido ({(refPct * 100).toFixed(0)}%)</span>
                <span>− {fmtMXN(refAmt)}</span>
              </div>}
              {agentAmt > 0 && <div className="flex justify-between text-sm text-brand-600">
                <span>— Asesor ({(agentPct * 100).toFixed(0)}%)</span>
                <span>− {fmtMXN(agentAmt)}</span>
              </div>}
              {agent2Amt > 0 && <div className="flex justify-between text-sm text-brand-600">
                <span>— 2° Asesor ({(agent2Pct * 100).toFixed(0)}%)</span>
                <span>− {fmtMXN(agent2Amt)}</span>
              </div>}
              <div className="flex justify-between text-sm font-semibold border-t border-ink-line pt-2 mt-2">
                <span className="text-ink">Comisión neta empresa</span>
                <span className="text-emerald-600">{fmtMXN(netAmt)}</span>
              </div>
            </div>
          )}

          {/* Fechas y estado */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-ink-muted">Fecha de cierre *</label>
              <div className="mt-1.5">
                <input type="date" value={form.closing_date} onChange={e => set("closing_date", e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-muted">Fecha esperada de cobro</label>
              <div className="mt-1.5">
                <input type="date" value={form.expected_collection_date} onChange={e => set("expected_collection_date", e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-muted">Estado de cobro</label>
              <div className="mt-1.5">
                <select value={form.status} onChange={e => set("status", e.target.value)} className={inp}>
                  <option value="pendiente">Pendiente</option>
                  <option value="parcial">Parcial</option>
                  <option value="cobrado">Cobrado</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-ink-muted">Notas</label>
            <div className="mt-1.5">
              <textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} className={`${inp} resize-none`} />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-ink-line flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-ink-line text-ink rounded-full text-sm">
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white rounded-full text-sm font-medium">
            {saving ? "Guardando..." : "Registrar operación"}
          </button>
        </div>
      </div>
    </div>
  );
}
