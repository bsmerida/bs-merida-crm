// app/admin/mapa/page.tsx
import { createAdminClient } from "@/lib/supabase/server";
import { AdminMapaExplorer } from "@/components/AdminMapaExplorer";
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
    <div className="p-4 md:p-6 space-y-5 font-dmsans">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px]">
            Mapa<em className="italic font-serif text-gold">.</em>
          </h1>
          <p className="text-[#6b7385] text-[15px] mt-1">
            {properties.length} con coordenadas
            {sinCoords ? ` · ${sinCoords} sin geocodificar` : ""}
          </p>
        </div>
        {sinCoords ? (
          <Link href="/admin/geocode"
            className="bg-navy hover:bg-navy-mid text-white font-semibold text-sm px-[22px] py-3 rounded-full transition-colors">
            Geocodificar {sinCoords} propiedades →
          </Link>
        ) : null}
      </div>
      <AdminMapaExplorer properties={properties} />
    </div>
  );
}
