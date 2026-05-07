"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function PropertyImageManager({ propertyId }: { propertyId: string }) {
  const [images, setImages] = useState<{ id: string; url: string; position: number; is_cover: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    const { data } = await supabase
      .from("property_images")
      .select("*")
      .eq("property_id", propertyId)
      .order("position");
    if (data) setImages(data);
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `${propertyId}/${Date.now()}_${i}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("property-images")
        .upload(path, file, { contentType: file.type });
      if (upErr) continue;
      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(path);
      const position = images.length + i;
      await supabase.from("property_images").insert({
        property_id: propertyId,
        url: urlData.publicUrl,
        position,
        is_cover: position === 0,
      });
    }
    setUploading(false);
    loadImages();
  };

  const setCover = async (id: string) => {
    await supabase.from("property_images").update({ is_cover: false }).eq("property_id", propertyId);
    await supabase.from("property_images").update({ is_cover: true }).eq("id", id);
    loadImages();
  };

  const deleteImage = async (id: string, url: string) => {
    await supabase.from("property_images").delete().eq("id", id);
    loadImages();
  };

  return (
    <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
      <h3 className="font-semibold text-ink mb-4">Imágenes</h3>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)} />
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        className="mb-4 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-sm font-medium px-5 py-2.5 rounded-full">
        {uploading ? "Subiendo..." : "Subir imágenes"}
      </button>
      {images.length === 0 ? (
        <div className="text-sm text-ink-muted text-center py-8 border-2 border-dashed border-ink-line rounded-xl">
          No hay imágenes. Sube la primera arriba.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map(img => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden border border-ink-line">
              <img src={img.url} alt="" className="w-full aspect-[4/3] object-cover" />
              {img.is_cover && (
                <span className="absolute top-2 left-2 bg-brand-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">Portada</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                {!img.is_cover && (
                  <button onClick={() => setCover(img.id)}
                    className="bg-white text-ink text-xs px-2 py-1 rounded-lg font-medium">
                    Portada
                  </button>
                )}
                <button onClick={() => deleteImage(img.id, img.url)}
                  className="bg-red-500 text-white text-xs px-2 py-1 rounded-lg font-medium">
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
