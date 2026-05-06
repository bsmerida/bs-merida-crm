"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message);
    } else {
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center hero-gradient px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10"><Logo className="h-9" /></div>
        <div className="bg-white rounded-3xl border border-ink-line shadow-card p-8">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Acceso staff</h1>
          <p className="text-sm text-ink-muted mt-1">Para administradores y asesores de BS Mérida.</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <label className="text-xs text-ink-muted">Correo</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full bg-ink-ghost border border-transparent rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-brand-300" />
            </div>
            <div>
              <label className="text-xs text-ink-muted">Contraseña</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full bg-ink-ghost border border-transparent rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-brand-300" />
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-3 rounded-full mt-2">
              {loading ? "Entrando..." : "Iniciar sesión"}
            </button>
          </form>
          <p className="text-xs text-ink-soft text-center mt-6">¿No tienes cuenta? El administrador la crea desde el panel de ajustes.</p>
        </div>
        <div className="text-center mt-6">
          <a href="/" className="text-sm text-ink-muted hover:text-ink">← Volver al sitio</a>
        </div>
      </div>
    </div>
  );
}
