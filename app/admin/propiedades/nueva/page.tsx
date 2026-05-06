import { PropertyForm } from "@/components/PropertyForm";

export default function NuevaPropiedadPage() {
  return (
    <div className="p-10 max-w-4xl">
      <h1 className="text-2xl font-semibold text-ink tracking-tight">Nueva propiedad</h1>
      <p className="text-sm text-ink-muted mt-0.5 mb-8">Llena los campos y publícala. Aparecerá automáticamente en el sitio web.</p>
      <PropertyForm />
    </div>
  );
}
