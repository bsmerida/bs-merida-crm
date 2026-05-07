"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_PROPIEDAD, OPERACIONES, ESTADOS_PROPIEDAD } from "@/lib/utils";
import type { Property } from "@/lib/supabase/types";

type Props = { property?: Property };

export function PropertyForm({ property }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: property?.title || "",
    description: property?.description || "",
    type: property?.type || "Casa",
    operation: property?.operation || "Venta",
    status: property?.status || "Disponible",
    price: property?.price?.toString() || "",
    address: property?.address || "",
    zone: property?.zone || "",
    city: property?.city || "Mérida",
    state: property?.state || "Yucatán",
    bedrooms: property?.bedrooms?.toString() || "0",
    bathrooms: property?.bathrooms?.toString() || "0",
    m2_construction: property?.m2_construction?.toString() || "",
    m2_land: property?.m2_land?.toString() || "",
    parking: property?.parking?.toString() || "0",
    amenities: property?.amenities?.join(", ") || "",
    is_published: property?.is_published ?? true,
    featured: property?.featured ?? false,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      ...form,
      price: Number(form.price),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      m2_construction: form.m2_construction ? Number(form.m2_construction) : null,
      m2_land: form.m2_land ? Number(form.m2_land) : null,
      parking: Number(form.parking),
      amenities: form.amenities.split(",").map(s => s.trim()).filter(Boolean),
    };

    const result = property
      ? await supabase.from("properties").update(payload).eq("id", property.id)
      : await supabase.from("properties").insert(payload);

    setSubmitting(false);
    if (result.error) {
      setError(result.error.message);
    } else {
      router.push("/admin/propiedades");
      router.refresh();
    }
  };

  const remove = async () => {
    if (!property || !confirm("¿Eliminar esta propiedad? Esta acción no se puede deshacer.")) return;
    setSubmitting(true);
    const { error } = await supabase.from("properties").delete().eq("id", property.id);
    setSubmitting(false);
    if (error) setError(error.message);
    else { router.push("/admin/propiedades"); router.refresh(); }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="text-xs text-ink-muted">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
  const inputCls = "w-full bg-ink-ghost border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-brand-300";

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-4">
        <h3 className="font-semibold text-ink">Información básica</h3>
        <Field label="Título *">
          <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ej. Casa en Provincia Residencial" className={inputCls} />
        </Field>
        <Field label="Descripción">
          <textarea rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={`${inputCls} resize-none`} />
        </Field>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Tipo *"><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputCls}>{TIPOS_PROPIEDAD.map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Operación *"><select value={form.operation} onChange={e => setForm({...form, operation: e.target.value})} className={inputCls}>{OPERACIONES.map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Estado *"><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>{ESTADOS_PROPIEDAD.map(t => <option key={t}>{t}</option>)}</select></Field>
        </div>
        <Field label="Precio MXN *">
          <input required type="number" min="0" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className={inputCls} />
        </Field>
      </div>

      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-4">
        <h3 className="font-semibold text-ink">Ubicación</h3>
        <Field label="Dirección"><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className={inputCls} /></Field>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Zona o colonia"><input value={form.zone} onChange={e => setForm({...form, zone: e.target.value})} placeholder="Ej. Provincia, Cholul" className={inputCls} /></Field>
          <Field label="Ciudad"><input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={inputCls} /></Field>
          <Field label="Estado"><input value={form.state} onChange={e => setForm({...form, state: e.target.value})} className={inputCls} /></Field>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-4">
        <h3 className="font-semibold text-ink">Características</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Field label="Recámaras"><input type="number" min="0" value={form.bedrooms} onChange={e => setForm({...form, bedrooms: e.target.value})} className={inputCls} /></Field>
          <Field label="Baños"><input type="number" min="0" step="0.5" value={form.bathrooms} onChange={e => setForm({...form, bathrooms: e.target.value})} className={inputCls} /></Field>
          <Field label="m² construcción"><input type="number" min="0" value={form.m2_construction} onChange={e => setForm({...form, m2_construction: e.target.value})} className={inputCls} /></Field>
          <Field label="m² terreno"><input type="number" min="0" value={form.m2_land} onChange={e => setForm({...form, m2_land: e.target.value})} className={inputCls} /></Field>
          <Field label="Estacionamientos"><input type="number" min="0" value={form.parking} onChange={e => setForm({...form, parking: e.target.value})} className={inputCls} /></Field>
        </div>
        <Field label="Amenidades (separadas por coma)">
          <input value={form.amenities} onChange={e => setForm({...form, amenities: e.target.value})} placeholder="Alberca, Jardín, Seguridad 24/7" className={inputCls} />
        </Field>
      </div>

      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-3">
        <h3 className="font-semibold text-ink">Publicación</h3>
        <label className="flex items-center gap-3 text-sm text-ink cursor-pointer">
          <input type="checkbox" checked={form.is_published} onChange={e => setForm({...form, is_published: e.target.checked})} className="w-4 h-4 accent-brand-500" />
          Publicar en el sitio web
        </label>
        <label className="flex items-center gap-3 text-sm text-ink cursor-pointer">
          <input type="checkbox" checked={form.featured} onChange={e => setForm({...form, featured: e.target.checked})} className="w-4 h-4 accent-brand-500" />
          Destacada (aparece primero en el inicio)
        </label>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

      <div className="flex items-center justify-between">
        {property && (
          <button type="button" onClick={remove} disabled={submitting} className="text-sm text-red-600 hover:text-red-700">
            Eliminar propiedad
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 bg-white border border-ink-line text-ink rounded-full text-sm hover:border-ink-soft">Cancelar</button>
          <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white rounded-full text-sm font-medium">
            {submitting ? "Guardando..." : property ? "Guardar cambios" : "Crear propiedad"}
          </button>
        </div>
      </div>
    </form>
  );
}
