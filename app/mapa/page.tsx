// app/mapa/page.tsx
import { createClient } from "@/lib/supabase/server";
import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";
import { PublicChatbot } from "@/components/PublicChatbot";
import { MapaExplorer } from "@/components/MapaExplorer";
import { fotosPorPropiedad } from "@/lib/fotos";

export const metadata = { title: "Mapa de Propiedades — Duclaud Bienes Raíces" };

export default async function MapaPage() {
  const supabase = createClient();

  const { data: props } = await supabase
    .from("properties")
    .select("id, title, price, operation, type, zone, city, bedrooms, bathrooms, m2_construction, lat, lng")
    .eq("is_published", true)
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

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active="/mapa" />
      <section className="py-4">
        <MapaExplorer properties={properties as any} />
      </section>
      <PublicFooterV3 />
      <PublicChatbot />
    </div>
  );
}
