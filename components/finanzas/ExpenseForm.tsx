"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hoyLocal } from "@/lib/finanzas";
import { Select } from "@/components/Select";

const CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: "nomina",                 label: "Nómina",                      icon: "👥" },
  { value: "comisiones_asesores",    label: "Comisiones asesores",         icon: "🤝" },
  { value: "marketing_digital",      label: "Marketing digital",            icon: "📱" },
  { value: "portales_inmobiliarios", label: "Portales inmobiliarios",       icon: "building" },
  { value: "software",               label: "Software y herramientas",      icon: "💻" },
  { value: "renta_oficina",          label: "Renta de oficina",             icon: "🏢" },
  { value: "servicios",              label: "Servicios (luz, internet...)", icon: "⚡" },
  { value: "legal",                  label: "Legal y notaría",              icon: "⚖️" },
  { value: "administrativo",         label: "Administrativo",               icon: "📋" },
  { value: "otro",                   label: "Otro",                         icon: "📦" },
];

const AMORT_OPTIONS = [
  { value: 1,  label: "No diferir — gasto del mes" },
  { value: 2,  label: "2 meses" },
  { value: 3,  label: "3 meses (trimestre)" },
  { value: 6,  label: "6 meses (semestre)" },
  { value: 12, label: "12 meses (anual)" },
];

const fmtMXN = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

export function ExpenseForm({ onClose, onSaved, expense }: { onClose: () => void; onSaved: () => void; expense?: any }) {
  const supabase = createClient();
  const isEditing = !!expense;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category:            expense?.category            || "administrativo",
    description:         expense?.description         || "",
    vendor:              expense?.vendor              || "",
    amount:              String(expense?.amount       || ""),
    expense_date:        expense?.expense_date        || hoyLocal(),
    is_deferred:         expense?.is_deferred         || false,
    amortization_months: expense?.amortization_months || 1,
    deferred_start_date: expense?.deferred_start_date || hoyLocal(),
    recurring:           expense?.recurring           || false,
    invoiced:            expense?.invoiced            || false,
    marketing_channel:   expense?.marketing_channel   || "",
    notes:               expense?.notes               || "",
  });

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));
  const amount = Number(form.amount) || 0;
  const monthlyImpact = form.is_deferred && form.amortization_months > 1
    ? amount / form.amortization_months
    : amount;

  const save = async () => {
    if (!form.description || !form.amount || !form.expense_date) {
      alert("Completa descripción, monto y fecha.");
      return;
    }
    setSaving(true);
    const payload = {
      category:            form.category,
      description:         form.description,
      vendor:              form.vendor || null,
      amount:              amount,
      expense_date:        form.expense_date,
      is_deferred:         form.is_deferred,
      amortization_months: form.is_deferred ? form.amortization_months : 1,
      deferred_start_date: form.is_deferred ? form.deferred_start_date : null,
      recurring:           form.recurring,
      invoiced:            form.invoiced,
      marketing_channel:   ["marketing_digital","portales_inmobiliarios"].includes(form.category) ? form.marketing_channel || null : null,
      notes:               form.notes || null,
    };
    const { error } = isEditing
      ? await supabase.from("expenses").update(payload).eq("id", expense.id)
      : await supabase.from("expenses").insert(payload);
    setSaving(false);
    if (error) { alert("Error: " + error.message); return; }
    onSaved();
    onClose();
  };

  const inp = "w-full bg-stone border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-navy/30";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-stone flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-navy text-lg">{isEditing ? "Editar gasto" : "Registrar gasto"}</h2>
          <button onClick={onClose} className="text-[#6b7385] hover:text-navy text-xl">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Categoría */}
          <div>
            <label className="text-xs text-[#6b7385] font-medium block mb-1.5">Categoría</label>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => set("category", c.value)}
                  className={`text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition ${form.category === c.value ? "bg-navy text-white" : "bg-stone hover:bg-stone/80 text-navy"}`}>
                  <span>{c.icon}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Canal de marketing — solo para gastos de marketing */}
          {["marketing_digital", "portales_inmobiliarios"].includes(form.category) && (
            <div>
              <label className="text-xs text-[#6b7385] font-medium block mb-1.5">
                Canal específico <span className="text-[#6b7385]">(para calcular ROI, CAC y ROAS por canal)</span>
              </label>
              <Select value={form.marketing_channel} onChange={v => set("marketing_channel", v)}
                className={`${inp} text-left`}
                options={[
                  { value: "", label: "— Sin atribuir a canal específico" },
                  { value: "Facebook", label: "Facebook / Meta Ads", group: "Redes sociales" },
                  { value: "Instagram", label: "Instagram Orgánico", group: "Redes sociales" },
                  { value: "TikTok", label: "TikTok", group: "Redes sociales" },
                  { value: "Google", label: "Google Ads", group: "Redes sociales" },
                  { value: "WhatsApp directo", label: "WhatsApp", group: "Redes sociales" },
                  { value: "Inmuebles24", label: "Inmuebles24", group: "Portales" },
                  { value: "Lamudi by Proppit", label: "Lamudi by Proppit", group: "Portales" },
                  { value: "Mercado Libre", label: "Mercado Libre", group: "Portales" },
                  { value: "Propiedades.com", label: "Propiedades.com", group: "Portales" },
                  { value: "EasyBroker", label: "EasyBroker", group: "Portales" },
                  { value: "Tokko", label: "Tokko", group: "Portales" },
                  { value: "TuPortalOnline", label: "TuPortalOnline", group: "Portales" },
                  { value: "InmoExperts", label: "InmoExperts", group: "Portales" },
                  { value: "Properstar", label: "Properstar", group: "Portales" },
                  { value: "Pincali", label: "Pincali", group: "Portales" },
                  { value: "Clasco", label: "Clasco", group: "Portales" },
                ]} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6b7385] font-medium block mb-1.5">Descripción *</label>
              <input value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Ej. Inmuebles24 anual" className={inp} />
            </div>
            <div>
              <label className="text-xs text-[#6b7385] font-medium block mb-1.5">Proveedor</label>
              <input value={form.vendor} onChange={e => set("vendor", e.target.value)}
                placeholder="Ej. Navent S.A." className={inp} />
            </div>
          </div>

          {/* Monto y fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6b7385] font-medium block mb-1.5">Monto total *</label>
              <input type="number" min="0" value={form.amount} onChange={e => set("amount", e.target.value)}
                placeholder="0.00" className={inp} />
            </div>
            <div>
              <label className="text-xs text-[#6b7385] font-medium block mb-1.5">Fecha de pago *</label>
              <input type="date" value={form.expense_date} onChange={e => set("expense_date", e.target.value)} className={inp} />
            </div>
          </div>

          {/* Gasto diferido */}
          <div className="bg-stone rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-navy">¿Es un gasto diferido?</p>
                <p className="text-xs text-[#6b7385] mt-0.5">Pagos anuales o semestrales que se amortizan mensualmente</p>
              </div>
              <button type="button" onClick={() => set("is_deferred", !form.is_deferred)}
                className={`w-12 h-6 rounded-full transition-colors relative ${form.is_deferred ? "bg-navy" : "bg-stone"}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${form.is_deferred ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>

            {form.is_deferred && (
              <div className="space-y-3 pt-2 border-t border-stone">
                <div>
                  <label className="text-xs text-[#6b7385] font-medium block mb-1.5">Meses de cobertura</label>
                  <Select value={String(form.amortization_months)} onChange={v => set("amortization_months", Number(v))}
                    options={AMORT_OPTIONS.slice(1).map(o => ({value:String(o.value),label:o.label}))}
                    className={`${inp} text-left`} />
                </div>
                <div>
                  <label className="text-xs text-[#6b7385] font-medium block mb-1.5">Inicio de la cobertura</label>
                  <input type="date" value={form.deferred_start_date} onChange={e => set("deferred_start_date", e.target.value)} className={inp} />
                </div>
                {amount > 0 && (
                  <div className="bg-cream border border-gold/20 rounded-xl px-4 py-3">
                    <p className="text-xs text-navy font-medium">Impacto en P&L</p>
                    <p className="text-sm text-navy mt-1">
                      <span className="font-semibold">{fmtMXN(monthlyImpact)}</span> por mes durante {form.amortization_months} meses
                    </p>
                    <p className="text-xs text-gold mt-0.5">
                      El Flujo de Caja refleja el pago real de {fmtMXN(amount)} en {form.expense_date}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Opciones adicionales */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.recurring} onChange={e => set("recurring", e.target.checked)}
                className="w-4 h-4 rounded text-gold" />
              <span className="text-xs text-[#6b7385]">Gasto recurrente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.invoiced} onChange={e => set("invoiced", e.target.checked)}
                className="w-4 h-4 rounded text-gold" />
              <span className="text-xs text-[#6b7385]">Con factura</span>
            </label>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs text-[#6b7385] font-medium block mb-1.5">Notas</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Notas adicionales..." rows={2} className={`${inp} resize-none`} />
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-stone rounded-full text-sm text-[#6b7385] hover:text-navy">
            Cancelar
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 bg-navy hover:bg-navy-mid text-white rounded-full text-sm font-medium disabled:opacity-50">
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Registrar gasto"}
          </button>
        </div>
      </div>
    </div>
  );
}
