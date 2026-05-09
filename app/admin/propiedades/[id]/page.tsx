import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyImageManager } from "@/components/PropertyImageManager";
import { PropertyNotes } from "@/components/PropertyNotes";
import type { Property } from "@/lib/supabase/types";

export default async function EditarPropiedadPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("properties").select("*").eq("id", params.id).single();
  if (!data) notFound();
  const property = data as Property;
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="p-10 max-w-4xl">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Editar propiedad</h1>
          <p className="text-sm text-ink-muted mt-0.5">{property.title}</p>
          {property.reference && (
            <span className="text-xs font-mono bg-brand-50 text-brand-600 px-2 py-0.5 rounded mt-1 inline-block">
              {property.reference}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/propiedad/${property.id}/pdf?mode=cliente`}
            className="bg-white border border-ink-line text-ink text-sm font-medium px-4 py-2 rounded-full hover:border-ink-soft inline-flex items-center gap-1.5">
            📄 Para cliente
          </a>
          <a href={`/api/propiedad/${property.id}/pdf?mode=asesor`}
            className="bg-white border border-ink-line text-ink text-sm font-medium px-4 py-2 rounded-full hover:border-ink-soft inline-flex items-center gap-1.5">
            📄 Para asesor
          </a>
        </div>
      </div>

      <div className="space-y-6">
        {/* Notas internas ARRIBA */}
        <PropertyNotes propertyId={property.id} userId={user?.id || ""} />
        <PropertyImageManager propertyId={property.id} />
        <PropertyForm property={property} />
      </div>
    </div>
  );
}
