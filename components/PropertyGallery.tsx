"use client";
import { useState, useEffect, useCallback } from "react";

type Image = { id: string; url: string };

export function PropertyGallery({ images, title }: { images: Image[]; title: string }) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, prev, next]);

  if (!images.length) return (
    <div className="aspect-[2.4/1] bg-gradient-to-br from-brand-50 to-brand-100 rounded-3xl flex items-center justify-center text-9xl">🏠</div>
  );

  return (
    <>
      {/* Carrusel principal */}
      <div className="space-y-3">
        {/* Imagen principal */}
        <div className="relative aspect-[2.4/1] rounded-3xl overflow-hidden bg-ink-ghost group">
          <img
            src={images[current].url}
            alt={`${title} — foto ${current + 1}`}
            className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-[1.02]"
            onClick={() => setLightbox(true)}
          />

          {/* Flechas */}
          {images.length > 1 && (
            <>
              <button onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-ink opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110">
                ‹
              </button>
              <button onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-ink opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110">
                ›
              </button>
            </>
          )}

          {/* Contador */}
          <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
            {current + 1} / {images.length}
          </div>

          {/* Ver todas */}
          {images.length > 1 && (
            <button onClick={() => setLightbox(true)}
              className="absolute bottom-4 left-4 bg-white/90 hover:bg-white text-ink text-xs px-3 py-1.5 rounded-full shadow flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
              🖼 Ver todas las fotos
            </button>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {images.map((img, i) => (
              <button key={img.id} onClick={() => setCurrent(i)}
                className={`shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 ${i === current ? "border-brand-500 scale-105 shadow-md" : "border-transparent opacity-60 hover:opacity-90"}`}>
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setLightbox(false)}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0" onClick={e => e.stopPropagation()}>
            <span className="text-white/70 text-sm">{title}</span>
            <div className="flex items-center gap-4">
              <span className="text-white/50 text-sm">{current + 1} / {images.length}</span>
              <button onClick={() => setLightbox(false)}
                className="text-white/70 hover:text-white text-2xl leading-none">✕</button>
            </div>
          </div>

          {/* Imagen grande */}
          <div className="flex-1 flex items-center justify-center px-16 relative" onClick={e => e.stopPropagation()}>
            <img
              src={images[current].url}
              alt={`${title} — foto ${current + 1}`}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
            {images.length > 1 && (
              <>
                <button onClick={prev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-2xl transition">
                  ‹
                </button>
                <button onClick={next}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-2xl transition">
                  ›
                </button>
              </>
            )}
          </div>

          {/* Thumbnails en lightbox */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-6 py-4 shrink-0 justify-center" onClick={e => e.stopPropagation()}>
              {images.map((img, i) => (
                <button key={img.id} onClick={() => setCurrent(i)}
                  className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === current ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-80"}`}>
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
