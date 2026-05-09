"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Stats = {
  views_total: number;
  views_7d: number;
  views_30d: number;
  inquiries_total: number;
  inquiries_7d: number;
};

export function PropertyStats({ propertyId }: { propertyId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
      const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

      const [v_total, v_7d, v_30d, i_total, i_7d] = await Promise.all([
        supabase.from("property_views").select("*", { count: "exact", head: true }).eq("property_id", propertyId),
        supabase.from("property_views").select("*", { count: "exact", head: true }).eq("property_id", propertyId).gte("viewed_at", d7.toISOString()),
        supabase.from("property_views").select("*", { count: "exact", head: true }).eq("property_id", propertyId).gte("viewed_at", d30.toISOString()),
        supabase.from("property_inquiries").select("*", { count: "exact", head: true }).eq("property_id", propertyId),
        supabase.from("property_inquiries").select("*", { count: "exact", head: true }).eq("property_id", propertyId).gte("created_at", d7.toISOString()),
      ]);

      setStats({
        views_total: v_total.count || 0,
        views_7d: v_7d.count || 0,
        views_30d: v_30d.count || 0,
        inquiries_total: i_total.count || 0,
        inquiries_7d: i_7d.count || 0,
      });
    };
    load();
  }, [propertyId]);

  if (!stats) return (
    <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 animate-pulse">
      <div className="h-4 bg-ink-ghost rounded w-32 mb-4"></div>
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-ink-ghost rounded-xl"></div>)}
      </div>
    </div>
  );

  const conversion = stats.views_total > 0
    ? ((stats.inquiries_total / stats.views_total) * 100).toFixed(1)
    : "0";

  return (
    <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-4">
      <h3 className="font-semibold text-ink">📊 Estadísticas</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-ink-ghost rounded-xl p-4 text-center">
          <div className="text-2xl font-semibold text-ink">{stats.views_total}</div>
          <div className="text-xs text-ink-muted mt-1">Vistas totales</div>
        </div>
        <div className="bg-ink-ghost rounded-xl p-4 text-center">
          <div className="text-2xl font-semibold text-ink">{stats.views_7d}</div>
          <div className="text-xs text-ink-muted mt-1">Vistas (7 días)</div>
        </div>
        <div className="bg-ink-ghost rounded-xl p-4 text-center">
          <div className="text-2xl font-semibold text-ink">{stats.inquiries_total}</div>
          <div className="text-xs text-ink-muted mt-1">Solicitudes totales</div>
        </div>
        <div className="bg-brand-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-semibold text-brand-600">{conversion}%</div>
          <div className="text-xs text-ink-muted mt-1">Conversión</div>
        </div>
      </div>
      {stats.views_30d > 0 && (
        <p className="text-xs text-ink-muted">
          {stats.views_30d} vistas en los últimos 30 días · {stats.inquiries_7d} solicitudes esta semana
        </p>
      )}
    </div>
  );
}
