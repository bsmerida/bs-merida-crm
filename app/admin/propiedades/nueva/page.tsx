import { createClient } from "@/lib/supabase/server";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyNotes } from "@/components/PropertyNotes";

export default async function NuevaPropiedadPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="p-10 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Nueva propiedad</h1>
        <p className="text-sm text-ink-muted mt-0.5">Completa la información y publica en el sitio.</p>
      </div>

      {/* Formulario principal — al guardar redirige a /admin/propiedades/[id] donde están las notas */}
      <PropertyForm />

      {/* Nota: las notas internas aparecen después de crear la propiedad, en la vista de edición */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
        💡 Las notas internas estarán disponibles una vez que guardes la propiedad.
      </div>
    </div>
  );
}
