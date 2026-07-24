// components/EquipoClient.tsx
"use client";
import { useState } from "react";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  active: boolean;
};

type Props = { profiles: Profile[]; currentUserId: string };

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin:  "bg-navy/10 text-navy",
    asesor: "bg-gold/15 text-amber-800",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${styles[role] || "bg-stone-100 text-stone-500"}`}>
      {role}
    </span>
  );
}

function NuevoUsuarioModal({ onSave, onClose }: { onSave: (p: Profile) => void; onClose: () => void }) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState("asesor");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");

  async function handleSave() {
    if (!name || !email || !password) { setErr("Completa todos los campos."); return; }
    if (password.length < 8) { setErr("La contraseña debe tener al menos 8 caracteres."); return; }
    setSaving(true); setErr("");
    const res  = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name, email, password, role }),
    });
    const data = await res.json();
    if (data.ok) {
      onSave({ id: data.user_id, full_name: name, email, role, active: true });
      onClose();
    } else {
      setErr(data.error || "Error al crear usuario");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-navy">Nuevo usuario</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-navy p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Nombre completo *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre y apellido"
              className="w-full border border-stone rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-navy"/>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Correo *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@duclaud.com.mx"
              className="w-full border border-stone rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-navy"/>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Contraseña temporal *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className="w-full border border-stone rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-navy"/>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Rol *</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full border border-stone rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-navy">
              <option value="asesor">Asesor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {err && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2 mt-3">{err}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-stone text-navy font-medium py-3 rounded-full hover:bg-cream transition text-sm">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-navy text-white font-medium py-3 rounded-full hover:bg-navy/90 transition disabled:opacity-50 text-sm">
            {saving ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EquipoClient({ profiles: initial, currentUserId }: Props) {
  const [profiles,   setProfiles]   = useState<Profile[]>(initial);
  const [showModal,  setShowModal]  = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [updating,   setUpdating]   = useState<string | null>(null);

  async function toggleActive(p: Profile) {
    setUpdating(p.id);
    const res = await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: p.id, active: !p.active }),
    });
    if ((await res.json()).ok) {
      setProfiles(prev => prev.map(u => u.id === p.id ? { ...u, active: !u.active } : u));
    }
    setUpdating(null);
  }

  async function changeRole(p: Profile, role: string) {
    setUpdating(p.id);
    const res = await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: p.id, role }),
    });
    if ((await res.json()).ok) {
      setProfiles(prev => prev.map(u => u.id === p.id ? { ...u, role } : u));
    }
    setUpdating(null);
  }

  async function deleteUser(id: string) {
    const res = await fetch("/api/admin/usuarios", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: id }),
    });
    if ((await res.json()).ok) {
      setProfiles(prev => prev.filter(u => u.id !== id));
    }
    setConfirmDel(null);
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-stone flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-ink">Equipo</h3>
            <p className="text-xs text-ink-muted mt-0.5">{profiles.length} usuario{profiles.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-navy text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-navy/90 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Agregar usuario
          </button>
        </div>

        <div className="divide-y divide-stone">
          {profiles.map(p => (
            <div key={p.id} className="px-6 py-4 flex items-center gap-4">
              {/* Avatar */}
              <div className="w-9 h-9 bg-navy/10 rounded-full flex items-center justify-center text-sm font-semibold text-navy shrink-0">
                {p.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "?"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{p.full_name || "Sin nombre"}</p>
                <p className="text-xs text-ink-muted truncate">{p.email}</p>
              </div>

              {/* Rol */}
              <select value={p.role} onChange={e => changeRole(p, e.target.value)}
                disabled={p.id === currentUserId || updating === p.id}
                className="border border-stone rounded-lg px-2 py-1 text-xs text-navy focus:outline-none focus:border-navy disabled:opacity-50">
                <option value="asesor">Asesor</option>
                <option value="admin">Admin</option>
              </select>

              {/* Estado */}
              <button onClick={() => toggleActive(p)}
                disabled={p.id === currentUserId || updating === p.id}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition disabled:opacity-50 ${
                  p.active ? "bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600" : "bg-stone-100 text-stone-500 hover:bg-emerald-50 hover:text-emerald-700"
                }`}>
                {p.active ? "Activo" : "Inactivo"}
              </button>

              {/* Eliminar */}
              {p.id !== currentUserId && (
                confirmDel === p.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setConfirmDel(null)} className="text-xs text-ink-soft px-2 py-1 rounded hover:bg-cream">No</button>
                    <button onClick={() => deleteUser(p.id)} className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg">Sí</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDel(p.id)} className="text-ink-line hover:text-red-400 transition p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    </svg>
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <NuevoUsuarioModal
          onSave={p => setProfiles(prev => [...prev, p])}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
