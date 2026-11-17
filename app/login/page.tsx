"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 font-dmsans">
      <div className="bg-white rounded-[44px] px-8 md:px-[56px] py-10 md:py-12 w-full max-w-[480px] flex flex-col items-center gap-[22px]">
        <p className="font-serif text-navy text-[34px] tracking-[1.36px]">D<span className="text-gold">.</span>UCLAUD</p>
        <p className="font-serif text-navy text-4xl md:text-[44px] md:tracking-[-0.44px] -mt-2">
          Acceso a<em className="italic font-serif text-gold">sesores.</em>
        </p>
        <p className="text-[#6b7385] text-[15px] -mt-2">Entra con tu cuenta del equipo.</p>

        <form onSubmit={submit} className="w-full flex flex-col gap-[14px]">
          <div className="w-full flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[#6b7385] text-xs font-semibold">Correo</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="nombre@duclaud.com.mx"
              className="bg-cream rounded-full px-[22px] py-[15px] text-navy text-[15px] focus:outline-none focus:ring-1 focus:ring-gold/40 placeholder:text-[#6b7385]" />
          </div>
          <div className="w-full flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[#6b7385] text-xs font-semibold">Contraseña</label>
            <input id="password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-cream rounded-full px-[22px] py-[15px] text-navy text-[15px] focus:outline-none focus:ring-1 focus:ring-gold/40 placeholder:text-[#6b7385]" />
          </div>
          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-navy hover:bg-navy-mid disabled:opacity-50 text-white font-semibold py-4 rounded-full transition-colors mt-1">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <a href="/" className="text-[#6b7385] hover:text-navy text-[13px] font-medium transition-colors">← Volver al sitio</a>
      </div>
    </div>
  );
}
