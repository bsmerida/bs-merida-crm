import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropertyForm } from "@/components/PropertyForm";
import type { Property } from "@/lib/supabase/types";

export default async function EditarPropiedadPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("properties").select("*").eq("id", params.id).single();
  if (!data) notFound();
  return (
    <div className="p-10 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Editar propiedad</h1>
          <p className="text-sm text-ink-muted mt-0.5">{(data as Property).title}</p>
        </div>
        <a href={`/api/propiedad/${(data as Property).id}/pdf`}
           className="bg-white border border-ink-line text-ink text-sm font-medium px-4 py-2 rounded-full hover:border-ink-soft inline-flex items-center gap-1.5">
          📄 Descargar ficha PDF
        </a>
      </div>
      <PropertyForm property={data as Property} />
    </div>
  );
}
