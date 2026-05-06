"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "./Icon";

export function LogoUploader({ currentLogoUrl }: { currentLogoUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFile = async (file: File) => {
    setError("");
    setSuccess(false);

    if (!["image/png", "image/jpeg", "image/svg+xml", "image/webp"].includes(file.type)) {
      setError("Formato no soportado. Usa PNG, JPG, SVG o WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo es muy grande. Máximo 5MB.");
      return;
    }

    setUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `logo.${ext}?v=${Date.now()}`;
      // 1) Subir archivo
      const { error: upErr } = await supabase.storage
        .from("branding")
        .upload(path.split("?")[0], file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      // 2) Obtener URL pública
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path.split("?")[0]);
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      // 3) Actualizar tabla
      const { error: dbErr } = await supabase.from("business_settings").upsert({ id: 1, logo_url: publicUrl });
      if (dbErr) throw dbErr;

      setSuccess(true);
      setPreview(publicUrl);
      setTimeout(() => router.refresh(), 500);
    } catch (e: any) {
      setError(e.message || "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!confirm("¿Quitar el logo? Volverá al SVG por defecto.")) return;
    setUploading(true);
    await supabase.from("business_settings").update({ logo_url: null }).eq("id", 1);
    setPreview(null);
    setUploading(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center gap-6">
        <div className="w-32 h-32 rounded-2xl bg-ink-ghost border border-ink-line flex items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="Vista previa" className="w-full h-full object-contain p-2" />
          ) : (
            <Icon name="building" className="w-10 h-10 text-ink-soft" />
          )}
        </div>
        <div className="flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-sm font-medium px-5 py-2.5 rounded-full"
          >
            {uploading ? "Subiendo..." : preview ? "Cambiar logo" : "Subir logo"}
          </button>
          {preview && (
            <button onClick={remove} disabled={uploading}
              className="ml-2 text-sm text-ink-muted hover:text-red-600">
              Quitar
            </button>
          )}
          <p className="text-xs text-ink-muted mt-2">PNG, JPG, SVG o WebP. Máximo 5MB.</p>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          {success && <p className="text-xs text-emerald-600 mt-2">✓ Logo actualizado. Refresca para verlo en todo el sitio.</p>}
        </div>
      </div>
    </div>
  );
}
