// app/mapa/page.tsx
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertiesMap } from "@/components/PropertiesMap";

export const metadata = { title: "Mapa de Propiedades — Duclaud Bienes Raíces" };

export default async function MapaPage() {
  const supabase = createClient();

  const { data: props } = await supabase
    .from("properties")
    .select("id, title, price, operation, type, zone, lat, lng")
    .eq("is_published", true)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("created_at", { ascending: false });

  // Obtener primera imagen de cada propiedad
  const { data: images } = await supabase
    .from("property_images")
    .select("property_id, url")
    .in("property_id", (props || []).map(p => p.id))
    .eq("is_main", true);

  const imageMap = Object.fromEntries((images || []).map(i => [i.property_id, i.url]));

  const properties = (props || []).map(p => ({
    ...p,
    image: imageMap[p.id] || null,
  }));

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <PublicHeader/>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-10">
        <div className="mb-6">
          <h1 className="font-serif text-3xl text-navy">Mapa de propiedades</h1>
          <p className="text-sm text-ink-muted mt-1">
            {properties.length} propiedad{properties.length !== 1 ? "es" : ""} disponible{properties.length !== 1 ? "s" : ""}
          </p>
        </div>
        <PropertiesMap properties={properties} height="70vh"/>
      </main>
      <PublicFooter/>
      <PublicChatbot/>
    </div>
  );
}
