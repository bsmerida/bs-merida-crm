import { createAdminClient } from "@/lib/supabase/server";
import { GeocodeRunner } from "@/components/GeocodeRunner";

export const dynamic = "force-dynamic";

export default async function GeocodeBatchPage() {
  const supabase = createAdminClient();

  const [{ count: total }, { data: sinCoords }] = await Promise.all([
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("id, title, address, zone, city, state").is("lat", null).order("title").limit(50),
  ]);

  const pendientes = sinCoords || [];
  const conUbicacion = (total || 0) - pendientes.length;

  return (
    <div className="p-4 md:p-6 space-y-5 font-dmsans">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px]">
            Geocodificar <em className="italic font-serif text-gold">propiedades.</em>
          </h1>
          <p className="text-[#6b7385] text-[15px] mt-1">Calcula la ubicación en el mapa de cada propiedad</p>
        </div>
        <GeocodeRunner />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="bg-white rounded-[28px] px-[26px] py-6">
          <p className="text-[#6b7385] text-[11px] uppercase tracking-[1.1px]">Con ubicación</p>
          <p className="text-navy text-[32px] font-semibold tracking-[-0.64px] mt-1">{conUbicacion}</p>
          <p className="text-[#6b7385] text-xs mt-1">de {total || 0} propiedades</p>
        </div>
        <div className="bg-white rounded-[28px] px-[26px] py-6">
          <p className="text-[#6b7385] text-[11px] uppercase tracking-[1.1px]">Sin ubicación</p>
          <p className="text-navy text-[32px] font-semibold tracking-[-0.64px] mt-1">{pendientes.length}</p>
          <p className="text-[#6b7385] text-xs mt-1">Necesitan dirección o zona</p>
        </div>
      </div>

      {pendientes.length > 0 && (
        <div className="bg-white rounded-[28px] px-[26px] py-6">
          <h3 className="font-serif text-navy text-[28px] mb-3">Pendientes</h3>
          <div className="divide-y divide-stone">
            {pendientes.map(p => {
              const tieneDireccion = !!(p.address || p.zone || (p.city && p.state));
              return (
                <div key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <p className="text-navy text-sm font-medium truncate">{p.title}</p>
                  <p className="text-[#6b7385] text-xs shrink-0">{tieneDireccion ? "Pendiente de verificar" : "Sin dirección"}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
