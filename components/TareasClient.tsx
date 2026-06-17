"use client";
import { useState, useMemo } from "react";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "normal" | "high" | "urgent";
  category?: string | null;
  assigned_to?: string | null;
  lead_id?: string | null;
  starts_at?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  assignee?: { id: string; full_name: string | null; initials: string | null } | null;
  lead?: { id: string; name: string } | null;
};

type Profile = { id: string; full_name: string | null };

const PRIORITY_MAP: Record<string, [string, string]> = {
  urgent: ["bg-red-100 text-red-700 border-red-200",     "Urgente"],
  high:   ["bg-amber-100 text-amber-700 border-amber-200","Alta"   ],
  normal: ["bg-blue-50 text-blue-600 border-blue-200",   "Normal" ],
  low:    ["bg-stone-100 text-stone-500 border-stone-200","Baja"   ],
};

const CATEGORY_OPTIONS = ["Seguimiento","Administración","Operaciones","Marketing","Otro"];

const STATUS_COLS: { key: Task["status"]; label: string; color: string }[] = [
  { key: "todo",        label: "Por hacer",   color: "border-stone bg-stone-50"        },
  { key: "in_progress", label: "En progreso", color: "border-amber-200 bg-amber-50"   },
  { key: "done",        label: "Completado",  color: "border-emerald-200 bg-emerald-50"},
];

function isOverdue(task: Task) {
  return task.status !== "done" && task.due_at && new Date(task.due_at) < new Date();
}

function formatDate(d: string) {
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function PriorityBadge({ p }: { p: string }) {
  const [cls, label] = PRIORITY_MAP[p] || PRIORITY_MAP.normal;
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

function Avatar({ name, initials }: { name: string | null; initials: string | null }) {
  const i = initials || name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "?";
  return (
    <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center text-[10px] font-semibold text-navy shrink-0" title={name || ""}>
      {i}
    </div>
  );
}

function TaskModal({
  task, profiles, currentUserId, leadId, onSave, onClose,
}: {
  task?: Task | null;
  profiles: Profile[];
  currentUserId: string;
  leadId?: string | null;
  onSave: (t: Task) => void;
  onClose: () => void;
}) {
  const [title,       setTitle]       = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status,      setStatus]      = useState<Task["status"]>(task?.status || "todo");
  const [priority,    setPriority]    = useState<"low"|"normal"|"high"|"urgent">(task?.priority || "normal");
  const [category,    setCategory]    = useState(task?.category || "");
  const [assignedTo,  setAssignedTo]  = useState(task?.assigned_to || currentUserId);
  const [startsAt,    setStartsAt]    = useState(task?.starts_at || "");
  const [dueAt,       setDueAt]       = useState(task?.due_at || "");
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState("");

  async function handleSave() {
    if (!title.trim()) { setErr("El título es requerido."); return; }
    setSaving(true); setErr("");
    const body = {
      title: title.trim(), description: description || null,
      status, priority, category: category || null,
      assigned_to: assignedTo || null,
      lead_id: task?.lead_id || leadId || null,
      starts_at: startsAt || null, due_at: dueAt || null,
    };
    const url    = task ? `/api/tareas/${task.id}` : "/api/tareas";
    const method = task ? "PATCH" : "POST";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data   = await res.json();
    if (data.task) { onSave(data.task); onClose(); }
    else { setErr(data.error || "Error al guardar"); setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-7 py-5 border-b border-stone">
          <h2 className="font-serif text-xl text-navy">{task ? "Editar tarea" : "Nueva tarea"}</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-navy p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-7 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="¿Qué hay que hacer?"
              className="w-full border border-stone rounded-xl px-4 py-3 text-sm text-navy placeholder:text-ink-line focus:outline-none focus:border-navy"/>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Detalles opcionales..." rows={3}
              className="w-full border border-stone rounded-xl px-4 py-3 text-sm text-navy placeholder:text-ink-line focus:outline-none focus:border-navy resize-none"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Prioridad</label>
              <select value={priority} onChange={e => setPriority(e.target.value as "low"|"normal"|"high"|"urgent")}
                className="w-full border border-stone rounded-xl px-3 py-2.5 text-sm text-navy focus:outline-none focus:border-navy">
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value as Task["status"])}
                className="w-full border border-stone rounded-xl px-3 py-2.5 text-sm text-navy focus:outline-none focus:border-navy">
                <option value="todo">Por hacer</option>
                <option value="in_progress">En progreso</option>
                <option value="done">Completado</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Fecha inicio</label>
              <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)}
                className="w-full border border-stone rounded-xl px-3 py-2.5 text-sm text-navy focus:outline-none focus:border-navy"/>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Fecha límite</label>
              <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}
                className="w-full border border-stone rounded-xl px-3 py-2.5 text-sm text-navy focus:outline-none focus:border-navy"/>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Categoría</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-stone rounded-xl px-3 py-2.5 text-sm text-navy focus:outline-none focus:border-navy">
              <option value="">Sin categoría</option>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>

          {profiles.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Asignado a</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                className="w-full border border-stone rounded-xl px-3 py-2.5 text-sm text-navy focus:outline-none focus:border-navy">
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || "Sin nombre"}</option>)}
              </select>
            </div>
          )}

          {err && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2">{err}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 border border-stone text-navy font-medium py-3 rounded-full hover:bg-cream transition text-sm">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-navy text-white font-medium py-3 rounded-full hover:bg-navy/90 transition disabled:opacity-50 text-sm">
              {saving ? "Guardando..." : task ? "Guardar cambios" : "Crear tarea"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task, onEdit, onDelete, onStatusChange,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task["status"]) => void;
}) {
  const overdue = isOverdue(task);
  const [confirmDel, setConfirmDel] = useState(false);

  const nextStatus: Record<Task["status"], Task["status"]> = {
    todo: "in_progress", in_progress: "done", done: "todo",
  };
  const nextLabel = { todo: "Iniciar", in_progress: "Completar", done: "Reabrir" };

  return (
    <div className={`bg-white rounded-2xl border p-4 space-y-3 ${overdue ? "border-red-200" : "border-stone"}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-ink-muted" : "text-navy"}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-ink-muted mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <PriorityBadge p={task.priority}/>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {task.category && (
          <span className="text-[10px] text-ink-soft bg-cream px-2 py-0.5 rounded-full capitalize">{task.category}</span>
        )}
        {task.lead && (
          <span className="text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full truncate max-w-[120px]">
            👤 {task.lead.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-[11px]">
        {task.starts_at && <span className="text-ink-muted">Inicio: {formatDate(task.starts_at)}</span>}
        {task.due_at && (
          <span className={overdue ? "text-red-500 font-semibold" : "text-ink-muted"}>
            {overdue ? "⚠ " : ""}Límite: {formatDate(task.due_at)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-stone">
        <div className="flex items-center gap-2">
          {task.assignee && <Avatar name={task.assignee.full_name} initials={task.assignee.initials}/>}
          <span className="text-[11px] text-ink-muted truncate max-w-[100px]">{task.assignee?.full_name?.split(" ")[0] || ""}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onStatusChange(task.id, nextStatus[task.status])}
            className="text-[10px] font-medium text-brand-600 hover:text-brand-700 px-2.5 py-1 rounded-lg hover:bg-brand-50 transition">
            {nextLabel[task.status]} →
          </button>
          <button onClick={() => onEdit(task)}
            className="p-1.5 text-ink-soft hover:text-navy rounded-lg hover:bg-cream transition">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          {!confirmDel ? (
            <button onClick={() => setConfirmDel(true)}
              className="p-1.5 text-ink-soft hover:text-red-400 rounded-lg hover:bg-red-50 transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/>
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => setConfirmDel(false)} className="text-[10px] text-ink-soft px-1.5 py-1 rounded hover:bg-cream">No</button>
              <button onClick={() => onDelete(task.id)} className="text-[10px] text-white bg-red-500 px-2 py-1 rounded-lg">Sí</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanView({ tasks, onEdit, onDelete, onStatusChange }: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: Task["status"]) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {STATUS_COLS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        return (
          <div key={col.key} className={`rounded-2xl border-2 p-4 ${col.color}`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-ink uppercase tracking-[0.1em]">{col.label}</p>
              <span className="text-xs text-ink-muted bg-white rounded-full px-2 py-0.5 border border-stone">{colTasks.length}</span>
            </div>
            <div className="space-y-3">
              {colTasks.length === 0 && <p className="text-xs text-ink-line text-center py-6">Sin tareas</p>}
              {colTasks.map(t => <TaskCard key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange}/>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ tasks, onEdit, onDelete, onStatusChange }: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: Task["status"]) => void;
}) {
  return (
    <div className="space-y-2">
      {tasks.length === 0 && <div className="text-center py-16"><p className="text-sm text-ink-muted">No hay tareas que coincidan.</p></div>}
      {tasks.map(t => <TaskCard key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange}/>)}
    </div>
  );
}

export function TareasClient({
  tasks: initial, profiles, currentUserId, isAdmin, leadId,
}: {
  tasks: any[];
  profiles: Profile[];
  currentUserId: string;
  isAdmin: boolean;
  leadId?: string | null;
}) {
  const [tasks,      setTasks]      = useState<Task[]>(initial);
  const [view,       setView]       = useState<"kanban" | "list">("kanban");
  const [showModal,  setShowModal]  = useState(false);
  const [editTask,   setEditTask]   = useState<Task | null>(null);
  const [filterPrio, setFilterPrio] = useState("all");
  const [filterCat,  setFilterCat]  = useState("all");
  const [search,     setSearch]     = useState("");

  const filtered = useMemo(() => tasks.filter(t => {
    if (filterPrio !== "all" && t.priority !== filterPrio) return false;
    if (filterCat  !== "all" && t.category  !== filterCat) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [tasks, filterPrio, filterCat, search]);

  function handleSave(saved: Task) {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  async function handleStatusChange(id: string, status: Task["status"]) {
    const res  = await fetch(`/api/tareas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, completed_at: status === "done" ? new Date().toISOString() : null }),
    });
    const data = await res.json();
    if (data.task) handleSave(data.task);
  }

  function openNew()        { setEditTask(null); setShowModal(true); }
  function openEdit(t: Task) { setEditTask(t);   setShowModal(true); }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={openNew}
          className="flex items-center gap-2 bg-navy text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-navy/90 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Nueva tarea
        </button>

        <div className="flex items-center bg-white border border-stone rounded-full p-0.5 text-xs">
          {(["kanban","list"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-full font-medium transition ${view===v?"bg-navy text-white":"text-ink-soft hover:text-navy"}`}>
              {v === "kanban" ? "Kanban" : "Lista"}
            </button>
          ))}
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar tarea..."
          className="border border-stone rounded-full px-4 py-2 text-sm text-navy placeholder:text-ink-line focus:outline-none focus:border-navy flex-1 min-w-[160px]"/>

        <select value={filterPrio} onChange={e => setFilterPrio(e.target.value)}
          className="border border-stone rounded-full px-3 py-2 text-sm text-navy focus:outline-none">
          <option value="all">Todas las prioridades</option>
          <option value="urgent">Urgente</option>
          <option value="high">Alta</option>
          <option value="normal">Normal</option>
          <option value="low">Baja</option>
        </select>

        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="border border-stone rounded-full px-3 py-2 text-sm text-navy focus:outline-none">
          <option value="all">Todas las categorías</option>
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
        </select>
      </div>

      {view === "kanban"
        ? <KanbanView tasks={filtered} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange}/>
        : <ListView   tasks={filtered} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange}/>
      }

      {showModal && (
        <TaskModal
          task={editTask}
          profiles={profiles}
          currentUserId={currentUserId}
          leadId={leadId}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
