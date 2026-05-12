"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  { value: "nomina",                label: "Nómina" },
  { value: "comisiones_asesores",   label: "Comisiones asesores" },
  { value: "marketing_digital",     label: "Marketing digital" },
  { value: "portales_inmobiliarios",label: "Portales inmobiliarios" },
  { value: "software",              label: "Software y herramientas" },
  { value: "renta_oficina",         label: "Renta de oficina" },
  { value: "servicios",             label: "Servicios (luz, internet...)" },
  { value: "legal",                 label: "Legal y notaría" },
  { value: "administrativo",        label: "Administrativo" },
  { value: "otro",                  label: "Otro" },
];

export function ExpenseForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "administrativo",
    subcategory: "",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    recurring: false,
    notes: "",
  });

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const save = async () => {
    if (!form.description || !form.amount || !form.expense_date) {
      alert("Completa descripción, monto y fecha.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      category: form.category,
      subcategory: form.subcategory || null,
      description: form.description,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      recurring: form.recurring,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { alert("Error: " + error.message); return; }
    onSaved();
    onClose();
  };

  const inp = "w-full bg-ink-ghost border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-brand-300";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-ink-line flex items-center justify-between">
          <h2 className="font-semibold text-ink text-lg">Registrar gasto</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-ink-muted">Categoría</label>
            <div className="mt-1.5">
              <select value={form.category} onChange={e => set("category", e.target.value)} className={inp}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-ink-muted">Descripción *</label>
            <div className="mt-1.5">
              <input value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Ej. Pauta Facebook mayo, Nómina Juan" className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-muted">Monto (MXN) *</label>
              <div className="mt-1.5">
                <input type="number" value={form.amount} onChange={e => set("amount", e.target.value)}
                  placeholder="Ej. 5000" className={inp} />
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-muted">Fecha *</label>
              <div className="mt-1.5">
                <input type="date" value={form.expense_date} onChange={e => set("expense_date", e.target.value)} className={inp} />
              </div>
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={form.recurring} onChange={e => set("recurring", e.target.checked)}
              className="w-4 h-4 accent-brand-500" />
            Gasto recurrente mensual
          </label>
          <div>
            <label className="text-xs text-ink-muted">Notas</label>
            <div className="mt-1.5">
              <textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} className={`${inp} resize-none`} />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-ink-line flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-ink-line text-ink rounded-full text-sm">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white rounded-full text-sm font-medium">
            {saving ? "Guardando..." : "Registrar gasto"}
          </button>
        </div>
      </div>
    </div>
  );
}
