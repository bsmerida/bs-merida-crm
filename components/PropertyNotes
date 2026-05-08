"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Note = { id: string; content: string; created_at: string };

export function PropertyNotes({ propertyId, userId }: { propertyId: string; userId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase
      .from("property_notes")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });
    if (data) setNotes(data);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await supabase.from("property_notes").insert({ property_id: propertyId, user_id: userId, content: text.trim() });
    setText("");
    setSaving(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    await supabase.from("property_notes").delete().eq("id", id);
    load();
  };

  return (
    <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-ink">🔒 Notas internas</h3>
        <span className="text-[10px] text-ink-muted bg-ink-ghost px-2 py-0.5 rounded-full">Solo visible para el equipo</span>
      </div>
      <div className="flex gap-2">
        <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
          placeholder="Escribe una nota interna..."
          className="flex-1 bg-ink-ghost border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-brand-300 resize-none" />
        <button onClick={save} disabled={saving || !text.trim()}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white rounded-xl text-sm font-medium self-end">
          {saving ? "..." : "Guardar"}
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="text-xs text-ink-muted text-center py-4">Sin notas todavía.</p>
      ) : (
        <div className="space-y-3">
          {notes.map(n => (
            <div key={n.id} className="bg-ink-ghost rounded-xl p-3 relative group">
              <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{n.content}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-ink-muted">
                  {new Date(n.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <button onClick={() => remove(n.id)}
                  className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
