import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/Icon";
import { EquipoClient } from "@/components/EquipoClient";

export default async function AjustesPage() {
  const supabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");

  return (
    <div className="p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Ajustes</h1>
        <p className="text-sm text-ink-muted mt-0.5">Empresa, usuarios y cumplimiento</p>
      </div>

      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
        <h3 className="font-semibold text-ink mb-5">Datos de la empresa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {[
            ["Nombre comercial", "Duclaud Bienes Raíces"],
            ["Sitio web", "www.duclaud.com.mx"],
            ["Dirección oficina principal", "Calle 13 #147, Col. México Oriente, Mérida, Yucatán"],
            ["Sucursal", "San Pedro Garza García, Nuevo León"],
            ["Teléfono Mérida", "999 746 6272"],
            ["WhatsApp", "999 746 6272"],
            ["Teléfono Monterrey", "81 4010 1300"],
            ["Correo", "contacto@duclaud.com.mx"],
            ["Membresía", "AMPI Mérida"],
            ["Certificación", "ECO110.02 · D-0036107323"],
          ].map(([l, v]) => (
            <div key={l}>
              <div className="text-xs text-ink-muted">{l}</div>
              <div className="text-ink mt-0.5">{v}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-soft mt-6">Para cambiar estos datos, edita las variables de entorno en Vercel.</p>
      </div>

      <EquipoClient profiles={profiles || []} currentUserId={user?.id || ""} />

      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
        <h3 className="font-semibold text-ink mb-1">Cumplimiento legal · México</h3>
        <p className="text-xs text-ink-muted mb-5">Configurado para cumplir con LFPDPPP (protección de datos) y normativa PLD.</p>
        <div className="space-y-3 text-sm text-ink">
          {[
            "Aviso de privacidad publicado y aceptado por todos los clientes",
            "Encriptación de datos sensibles en Supabase",
            "Registro de auditoría activo",
            "Mecanismo de derechos ARCO disponible",
            "Respaldos diarios con retención de 30 días (Supabase)",
          ].map(t => (
            <div key={t} className="flex items-center gap-3"><Icon name="check" className="w-4 h-4 text-brand-600" /> {t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
