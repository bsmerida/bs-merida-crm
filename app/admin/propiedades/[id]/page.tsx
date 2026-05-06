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
      <h1 className="text-2xl font-semibold text-ink tracking-tight">Editar propiedad</h1>
      <p className="text-sm text-ink-muted mt-0.5 mb-8">{(data as Property).title}</p>
      <PropertyForm property={data as Property} />
    </div>
  );
}
