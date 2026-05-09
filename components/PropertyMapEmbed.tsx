"use client";

type Props = { lat: number; lng: number; title: string };

export function PropertyMapEmbed({ lat, lng, title }: Props) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;

  return (
    <div className="space-y-2">
      <div className="w-full h-64 rounded-2xl overflow-hidden border border-ink-line">
        <iframe
          src={src}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Ubicación: ${title}`}
        />
      </div>
      <a
        href={`https://maps.google.com/?q=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-ink-muted hover:text-brand-600"
      >
        Abrir en Google Maps ↗
      </a>
    </div>
  );
}
