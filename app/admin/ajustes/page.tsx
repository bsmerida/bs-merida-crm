import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/Icon";

export default async function AjustesPage() {
  const supabase = createClient();
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
            ["Nombre comercial", "Inmobiliaria BS Mérida"],
            ["Sitio web", "bsmerida.com"],
            ["Dirección oficina principal", "Calle 13 #147, Col. México Oriente, Mérida, Yucatán"],
            ["Sucursal", "San Pedro Garza García, Nuevo León"],
            ["Teléfono Mérida", "999 303 4815"],
            ["WhatsApp", "999 746 6272"],
            ["Teléfono Monterrey", "81 4010 1300"],
            ["Correo", "bsmerida19@gmail.com"],
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

      <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-ink-line">
          <h3 className="font-semibold text-ink">Usuarios del sistema</h3>
          <p className="text-xs text-ink-muted mt-1">Para agregar usuarios nuevos, ve a Supabase → Authentication → Users → Add user.</p>
        </div>
        <table className="w-full">
          <thead className="border-b border-ink-line"><tr>{["Usuario", "Rol", "Correo", "Estado"].map(h => <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-6 py-3.5">{h}</th>)}</tr></thead>
          <tbody>
            {(profiles || []).map((u: any) => (
              <tr key={u.id} className="border-b border-ink-line last:border-0">
                <td className="px-6 py-4 text-sm font-medium text-ink">{u.full_name || "Sin nombre"}</td>
                <td className="px-6 py-4 text-sm text-ink-muted capitalize">{u.role}</td>
                <td className="px-6 py-4 text-sm text-ink-muted">{u.email}</td>
                <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded-full ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-ink-ghost text-ink-muted"}`}>{u.active ? "Activo" : "Inactivo"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
