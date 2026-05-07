import { createClient } from "@/lib/supabase/server";
import { LogoUploader } from "@/components/LogoUploader";

export default async function BrandingPage() {
  const supabase = createClient();
  const { data: settings } = await supabase.from("business_settings").select("*").eq("id", 1).single();

  return (
    <div className="p-10 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Marca</h1>
        <p className="text-sm text-ink-muted mt-0.5">Logo e identidad visual del sitio</p>
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-ink-line shadow-card p-8">
        <h3 className="font-semibold text-ink">Logo de la empresa</h3>
        <p className="text-sm text-ink-muted mt-1">
          Sube tu logo en formato PNG, JPG o SVG. Se va a usar en el header del sitio público y en el admin. Recomendación: usa fondo transparente (PNG o SVG).
        </p>
        <div className="mt-6">
          <LogoUploader currentLogoUrl={settings?.logo_url || null} />
        </div>
      </div>

      <div className="mt-6 bg-brand-50 border border-brand-200 rounded-2xl p-6">
        <h4 className="font-semibold text-ink text-sm">¿Cómo funciona?</h4>
        <p className="text-sm text-ink-muted mt-2 leading-relaxed">
          Tu logo se guarda en almacenamiento seguro (Supabase Storage). Cuando lo cambies, el sitio se actualiza al instante en todas las páginas — no necesitas redeployar ni tocar GitHub.
        </p>
      </div>
    </div>
  );
}
