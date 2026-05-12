"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_PROPIEDAD, OPERACIONES, ESTADOS_PROPIEDAD } from "@/lib/utils";
import type { Property } from "@/lib/supabase/types";

type Props = { property?: Property };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-ink-muted">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function fmtPrice(price: string, type: string, currency = "MXN") {
  if (!price) return "—";
  const n = new Intl.NumberFormat(currency === "USD" ? "en-US" : "es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(price));
  if (type === "m2") return `${n} / m²`;
  if (type === "lineal") return `${n} / ml`;
  return n;
}

export function PropertyForm({ property }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: property?.title || "",
    description: property?.description || "",
    type: property?.type || "Casa",
    operation: property?.operation || "Venta",
    status: property?.status || "Disponible",
    price: property?.price?.toString() || "",
    price_type: (property as any)?.price_type || "total",
    currency: (property as any)?.currency || "MXN",
    address: property?.address || "",
    zone: property?.zone || "",
    city: property?.city || "",
    state: property?.state || "",
    lat: (property as any)?.lat?.toString() || "",
    lng: (property as any)?.lng?.toString() || "",
    bedrooms: property?.bedrooms?.toString() || "0",
    bathrooms: property?.bathrooms?.toString() || "0",
    m2_construction: property?.m2_construction?.toString() || "",
    m2_land: property?.m2_land?.toString() || "",
    parking: property?.parking?.toString() || "0",
    amenities: property?.amenities?.join(", ") || "",
    is_published: property?.is_published ?? true,
    featured: property?.featured ?? false,
    reference: property?.reference || "",
    development: (property as any)?.development || "",
  });

  const set = useCallback((field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
  }, []);

  const generateReference = async () => {
    const now = new Date();
    const ym = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const { count } = await supabase
      .from("properties").select("*", { count: "exact", head: true })
      .like("reference", `BS-${ym}-%`);
    const seq = String((count || 0) + 1).padStart(3, "0");
    set("reference", `BS-${ym}-${seq}`);
  };

  const geocode = async () => {
    const q = [form.address, form.zone, form.city, form.state, "México"].filter(Boolean).join(", ");
    if (!q.trim()) { alert("Llena al menos la ciudad antes de ubicar."); return; }
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok && data.lat) {
        setForm(f => ({ ...f, lat: String(data.lat), lng: String(data.lng) }));
      } else {
        alert("No se encontraron coordenadas. Revisa que la dirección esté completa.");
      }
    } catch {
      alert("Error al buscar coordenadas.");
    }
    setGeocoding(false);
  };

  const handleFileSelect = (files: FileList) => {
    const arr = Array.from(files);
    setPendingFiles(prev => [...prev, ...arr]);
    arr.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removePending = (i: number) => {
    setPendingFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const uploadImages = async (propertyId: string) => {
    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const ext = file.name.split(".").pop();
      const path = `${propertyId}/${Date.now()}_${i}.${ext}`;
      const { error: upErr } = await supabase.storage.from("property-images").upload(path, file, { contentType: file.type });
      if (upErr) continue;
      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(path);
      await supabase.from("property_images").insert({ property_id: propertyId, url: urlData.publicUrl, position: i, is_cover: i === 0 });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload: any = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      operation: form.operation,
      status: form.status,
      price: Number(form.price),
      price_type: form.price_type,
      currency: form.currency,
      address: form.address || null,
      zone: form.zone || null,
      city: form.city || null,
      state: form.state || null,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      m2_construction: form.m2_construction ? Number(form.m2_construction) : null,
      m2_land: form.m2_land ? Number(form.m2_land) : null,
      parking: Number(form.parking),
      amenities: form.amenities.split(",").map(s => s.trim()).filter(Boolean),
      is_published: form.is_published,
      featured: form.featured,
      reference: form.reference || null,
      development: form.development || null,
    };

    if (property) {
      const { error: err } = await supabase.from("properties").update(payload).eq("id", property.id);
      setSubmitting(false);
      if (err) { setError(err.message); return; }
      router.push("/admin/propiedades");
      router.refresh();
    } else {
      const { data: newProp, error: err } = await supabase.from("properties").insert(payload).select("id").single();
      if (err || !newProp) { setSubmitting(false); setError(err?.message || "Error al crear"); return; }
      if (pendingFiles.length > 0) { setUploading(true); await uploadImages(newProp.id); setUploading(false); }
      setSubmitting(false);
      router.push(`/admin/propiedades/${newProp.id}`);
      router.refresh();
    }
  };

  const remove = async () => {
    if (!property || !confirm("¿Eliminar esta propiedad?")) return;
    setSubmitting(true);
    const { error: err } = await supabase.from("properties").delete().eq("id", property.id);
    setSubmitting(false);
    if (err) setError(err.message);
    else { router.push("/admin/propiedades"); router.refresh(); }
  };

  const inp = "w-full bg-ink-ghost border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-brand-300";
  const priceLabel = form.price_type === "m2" ? `Precio por m² ${form.currency} *` : form.price_type === "lineal" ? `Precio por metro lineal ${form.currency} *` : `Precio total ${form.currency} *`;

  return (
    <form onSubmit={submit} className="space-y-6">

      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-4">
        <h3 className="font-semibold text-ink">Información básica</h3>
        <Field label="Título *">
          <input required value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ej. Casa en Provincia Residencial" className={inp} />
        </Field>
        <Field label="Descripción">
          <textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)} className={`${inp} resize-none`} />
        </Field>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Tipo *">
            <select value={form.type} onChange={e => set("type", e.target.value)} className={inp}>
              {TIPOS_PROPIEDAD.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Operación *">
            <select value={form.operation} onChange={e => set("operation", e.target.value)} className={inp}>
              {OPERACIONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Estado *">
            <select value={form.status} onChange={e => set("status", e.target.value)} className={inp}>
              {ESTADOS_PROPIEDAD.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Desarrollador / Proyecto">
          <input value={form.development} onChange={e => set("development", e.target.value)} placeholder="Ej. Grupo Dicas" className={inp} />
        </Field>
        <Field label="Código identificador">
          <div className="flex gap-2">
            <input value={form.reference} onChange={e => set("reference", e.target.value)} placeholder="Ej. BS-2505-001" className={`${inp} flex-1`} />
            <button type="button" onClick={generateReference}
              className="px-4 py-2.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 rounded-xl text-sm whitespace-nowrap">
              ✨ Generar
            </button>
          </div>
        </Field>
      </div>

      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-4">
        <h3 className="font-semibold text-ink">Precio</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">Tipo:</span>
            {(["total", "m2", "lineal"] as const).map(t => (
              <button key={t} type="button" onClick={() => set("price_type", t)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                  form.price_type === t ? "bg-brand-500 text-white border-brand-500" : "bg-white text-ink border-ink-line hover:border-brand-300"
                }`}>
                {t === "total" ? "Total" : t === "m2" ? "Por m²" : "Por metro lineal"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">Moneda:</span>
            {(["MXN", "USD"] as const).map(c => (
              <button key={c} type="button" onClick={() => set("currency", c)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                  form.currency === c ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-ink border-ink-line hover:border-emerald-300"
                }`}>
                {c === "MXN" ? "🇲🇽 MXN" : "🇺🇸 USD"}
              </button>
            ))}
          </div>
        </div>
        <Field label={priceLabel}>
          <input required type="number" min="0" value={form.price} onChange={e => set("price", e.target.value)} className={inp} />
        </Field>
        {form.price_type !== "total" && form.price && (
          <p className="text-xs text-ink-muted bg-ink-ghost rounded-lg px-3 py-2">
            Se mostrará como <strong>{fmtPrice(form.price, form.price_type, form.currency)}</strong> en el sitio y la ficha.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-4">
        <h3 className="font-semibold text-ink">Ubicación</h3>
        <Field label="Dirección">
          <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Ej. Calle 20 #123, Col. García Ginerés" className={inp} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Zona o colonia">
            <input value={form.zone} onChange={e => set("zone", e.target.value)} placeholder="Ej. Provincia, Cholul" className={inp} />
          </Field>
          <Field label="Ciudad">
            <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Ej. Mérida" className={inp} />
          </Field>
          <Field label="Estado">
            <input value={form.state} onChange={e => set("state", e.target.value)} placeholder="Ej. Yucatán" className={inp} />
          </Field>
        </div>
        <button type="button" onClick={geocode} disabled={geocoding}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 rounded-xl text-sm disabled:opacity-50">
          {geocoding ? "⏳ Buscando..." : "📍 Ubicar en el mapa"}
        </button>
        {form.lat && form.lng && (
          <div className="flex items-center gap-3 text-xs text-emerald-600">
            <span>✓ Coordenadas guardadas</span>
            <a href={`https://maps.google.com/?q=${form.lat},${form.lng}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Ver en Google Maps ↗
            </a>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-4">
        <h3 className="font-semibold text-ink">Características</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Field label="Recámaras"><input type="number" min="0" value={form.bedrooms} onChange={e => set("bedrooms", e.target.value)} className={inp} /></Field>
          <Field label="Baños"><input type="number" min="0" step="0.5" value={form.bathrooms} onChange={e => set("bathrooms", e.target.value)} className={inp} /></Field>
          <Field label="m² construcción"><input type="number" min="0" value={form.m2_construction} onChange={e => set("m2_construction", e.target.value)} className={inp} /></Field>
          <Field label="m² terreno"><input type="number" min="0" value={form.m2_land} onChange={e => set("m2_land", e.target.value)} className={inp} /></Field>
          <Field label="Estacionamientos"><input type="number" min="0" value={form.parking} onChange={e => set("parking", e.target.value)} className={inp} /></Field>
        </div>
        <Field label="Amenidades (separadas por coma)">
          <input value={form.amenities} onChange={e => set("amenities", e.target.value)} placeholder="Alberca, Jardín, Seguridad 24/7" className={inp} />
        </Field>
      </div>

      {!property && (
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-4">
          <h3 className="font-semibold text-ink">Imágenes</h3>
          <p className="text-xs text-ink-muted">La primera imagen será la portada.</p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => e.target.files && handleFileSelect(e.target.files)} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-ink-line rounded-xl py-8 text-center hover:border-brand-300 hover:bg-brand-50/30 transition text-sm text-ink-muted">
            + Seleccionar imágenes
          </button>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-ink-ghost">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute top-1 left-1 bg-brand-500 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">Portada</span>}
                  <button type="button" onClick={() => removePending(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs hover:bg-red-500 flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-3">
        <h3 className="font-semibold text-ink">Publicación</h3>
        <label className="flex items-center gap-3 text-sm text-ink cursor-pointer">
          <input type="checkbox" checked={form.is_published} onChange={e => set("is_published", e.target.checked)} className="w-4 h-4 accent-brand-500" />
          Publicar en el sitio web
        </label>
        <label className="flex items-center gap-3 text-sm text-ink cursor-pointer">
          <input type="checkbox" checked={form.featured} onChange={e => set("featured", e.target.checked)} className="w-4 h-4 accent-brand-500" />
          Destacada (aparece primero)
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
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 bg-white border border-ink-line text-ink rounded-full text-sm hover:border-ink-soft">
            Cancelar
          </button>
          <button type="submit" disabled={submitting || uploading}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white rounded-full text-sm font-medium">
            {uploading ? "Subiendo imágenes..." : submitting ? "Guardando..." : property ? "Guardar cambios" : "Crear propiedad"}
          </button>
        </div>
      </div>
    </form>
  );
}
