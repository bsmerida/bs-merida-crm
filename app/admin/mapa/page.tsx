// app/admin/mapa/page.tsx
import { createAdminClient } from "@/lib/supabase/server";
import { PropertiesMap } from "@/components/PropertiesMap";
import Link from "next/link";
import { fotosPorPropiedad } from "@/lib/fotos";

export default async function AdminMapaPage() {
  const supabase = createAdminClient();

  const { data: props } = await supabase
    .from("properties")
    .select("id, title, price, operation, type, zone, lat, lng, status, is_published")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("created_at", { ascending: false });

  // Hasta 3 fotos por propiedad, por lotes (antes la consulta fallaba completa y no
  // salía ninguna). 3 y no 5: con 408 propiedades son ~170 KB en vez de ~270 KB por visita.
  const imageMap = await fotosPorPropiedad(supabase, (props || []).map(p => p.id), 3);

  const properties = (props || []).map(p => ({
    ...p,
    images: imageMap[p.id] || [],
  }));

  const { count: sinCoords } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .is("lat", null);

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Mapa de propiedades</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {properties.length} con coordenadas
            {sinCoords ? ` · ${sinCoords} sin geocodificar` : ""}
          </p>
        </div>
        {sinCoords ? (
          <Link href="/admin/propiedades?tab=coordenadas"
            className="text-sm bg-gold text-white px-4 py-2 rounded-full hover:bg-gold/90 transition">
            Geocodificar {sinCoords} propiedades →
          </Link>
        ) : null}
      </div>
      <PropertiesMap properties={properties} height="75vh"/>
    </div>
  );
}
