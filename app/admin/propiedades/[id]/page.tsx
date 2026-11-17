import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { canManage, getAuth } from "@/lib/auth";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyImageManager } from "@/components/PropertyImageManager";
import { PropertyNotes } from "@/components/PropertyNotes";
import { PropertyStats } from "@/components/PropertyStats";
import type { Property } from "@/lib/supabase/types";

export default async function EditarPropiedadPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("properties").select("*").eq("id", params.id).single();
  // Con service role no aplica RLS: el asesor solo puede abrir sus propiedades
  const auth = await getAuth();
  if (!data || !auth || !canManage(auth, data.agent_id)) notFound();
  const property = data as Property;

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-navy text-2xl tracking-tight">Editar propiedad</h1>
          <p className="text-sm text-[#6b7385] mt-0.5">{property.title}</p>
          {property.reference && (
            <span className="text-xs font-mono bg-cream text-gold px-2 py-0.5 rounded mt-1 inline-block">
              {property.reference}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/propiedad/${property.id}/pdf?mode=cliente`}
            className="bg-white border border-stone text-navy text-sm font-medium px-4 py-2 rounded-full hover:border-ink-soft">
            📄 Para cliente
          </a>
          <a href={`/api/propiedad/${property.id}/pdf?mode=asesor`}
            className="bg-white border border-stone text-navy text-sm font-medium px-4 py-2 rounded-full hover:border-ink-soft">
            📄 Para asesor
          </a>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Estadísticas */}
        <PropertyStats propertyId={property.id} />
        {/* 2. Notas internas */}
        <PropertyNotes propertyId={property.id} userId={auth.userId} />
        {/* 3. Imágenes */}
        <PropertyImageManager propertyId={property.id} />
        {/* 4. Formulario */}
        <PropertyForm property={property} />
      </div>
    </div>
  );
}
