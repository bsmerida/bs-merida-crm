// components/PushPermission.tsx
"use client";
import { useState, useEffect } from "react";

export function PushPermission() {
  const [status,      setStatus]      = useState<"default"|"granted"|"denied"|"unsupported">("default");
  const [loading,     setLoading]     = useState(false);
  const [dismissed,   setDismissed]   = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported"); return;
    }
    setStatus(Notification.permission as any);
    const d = localStorage.getItem("push_dismissed");
    if (d) setDismissed(true);
  }, []);

  async function requestPermission() {
    setLoading(true);
    try {
      // Registrar service worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Pedir permiso
      const permission = await Notification.requestPermission();
      setStatus(permission as any);

      if (permission === "granted") {
        // Suscribir al push
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub }),
        });
      }
    } catch (err) {
      console.error("Push error:", err);
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    localStorage.setItem("push_dismissed", "1");
    setDismissed(true);
  }

  if (status === "unsupported" || status === "granted" || dismissed) return null;

  return (
    <div className="mx-6 md:mx-10 mb-0 mt-4">
      <div className="bg-navy/5 border border-navy/10 rounded-2xl px-5 py-4 flex items-center gap-4">
        <div className="w-9 h-9 bg-gold/15 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-navy">Activa las notificaciones</p>
          <p className="text-xs text-ink-muted mt-0.5">Recibe alertas de nuevas solicitudes de cita y clientes aunque no tengas el CRM abierto.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={dismiss} className="text-xs text-ink-soft hover:text-ink px-3 py-1.5 rounded-lg hover:bg-white transition">
            Ahora no
          </button>
          <button onClick={requestPermission} disabled={loading}
            className="text-xs bg-navy text-white font-medium px-4 py-1.5 rounded-full hover:bg-navy/90 transition disabled:opacity-50">
            {loading ? "..." : "Activar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding  = "=".repeat((4 - base64String.length % 4) % 4);
  const base64   = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData  = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
