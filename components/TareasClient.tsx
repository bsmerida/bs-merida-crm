"use client";
import { useState, useMemo } from "react";
import { meridaParts, addDaysYmd } from "@/lib/time";
import { Select } from "@/components/Select";

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
  urgent: ["bg-red-100 text-red-700",     "Urgente"],
  high:   ["bg-amber-100 text-amber-700", "Alta"   ],
  normal: ["bg-blue-50 text-blue-600",    "Normal" ],
  low:    ["bg-stone text-[#6b7385]",     "Baja"   ],
};

const CATEGORY_OPTIONS = ["Seguimiento","Administración","Operaciones","Marketing","Otro"];

// Figma agrupa las tareas por fecha límite (Hoy / Esta semana / Después),
// no por estado — las vencidas caen en "Hoy" para que no se pierdan.
const DATE_COLS = ["hoy", "semana", "despues"] as const;
type DateCol = (typeof DATE_COLS)[number];
const DATE_COL_LABEL: Record<DateCol, string> = { hoy: "Hoy", semana: "Esta semana", despues: "Después" };

function dueBucket(task: Task, hoy: string, limiteSemana: string): DateCol {
  if (!task.due_at) return "despues";
  if (task.due_at <= hoy) return "hoy";
  if (task.due_at <= limiteSemana) return "semana";
  return "despues";
}

// due_at es fecha sin hora (YYYY-MM-DD): comparar como string contra el día
// de hoy en Mérida, no con new Date() (interpreta "YYYY-MM-DD" como medianoche
// UTC, que cae en la tarde del día anterior en Mérida).
function isOverdue(task: Task) {
  return task.status !== "done" && !!task.due_at && task.due_at < meridaParts(new Date()).ymd;
}

function formatDate(d: string) {
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function PriorityBadge({ p }: { p: string }) {
  const [cls, label] = PRIORITY_MAP[p] || PRIORITY_MAP.normal;
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function TaskModal({
  task, profiles, currentUserId, leadId, onSave, onClose, onDelete,
}: {
  task?: Task | null;
  profiles: Profile[];
  currentUserId: string;
  leadId?: string | null;
  onSave: (t: Task) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
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
          <button onClick={onClose} className="text-[#6b7385] hover:text-navy p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-7 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-[#6b7385] block mb-1.5">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="¿Qué hay que hacer?"
              className="w-full bg-stone border border-transparent rounded-xl px-4 py-3 text-sm text-navy placeholder:text-[#6b7385]/60 focus:outline-none focus:bg-white focus:border-navy/30"/>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-[#6b7385] block mb-1.5">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Detalles opcionales..." rows={3}
              className="w-full bg-stone border border-transparent rounded-xl px-4 py-3 text-sm text-navy placeholder:text-[#6b7385]/60 focus:outline-none focus:bg-white focus:border-navy/30 resize-none"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-[#6b7385] block mb-1.5">Prioridad</label>
              <Select value={priority} onChange={v => setPriority(v as "low"|"normal"|"high"|"urgent")}
                options={[{value:"low",label:"Baja"},{value:"normal",label:"Normal"},{value:"high",label:"Alta"},{value:"urgent",label:"Urgente"}]}
                className="w-full bg-stone border border-transparent rounded-xl px-3 py-2.5 text-sm text-navy text-left focus:outline-none focus:bg-white focus:border-navy/30"/>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-[#6b7385] block mb-1.5">Estado</label>
              <Select value={status} onChange={v => setStatus(v as Task["status"])}
                options={[{value:"todo",label:"Por hacer"},{value:"in_progress",label:"En progreso"},{value:"done",label:"Completado"}]}
                className="w-full bg-stone border border-transparent rounded-xl px-3 py-2.5 text-sm text-navy text-left focus:outline-none focus:bg-white focus:border-navy/30"/>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-[#6b7385] block mb-1.5">Fecha inicio</label>
              <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)}
                className="w-full bg-stone border border-transparent rounded-xl px-3 py-2.5 text-sm text-navy focus:outline-none focus:bg-white focus:border-navy/30"/>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-[#6b7385] block mb-1.5">Fecha límite</label>
              <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}
                className="w-full bg-stone border border-transparent rounded-xl px-3 py-2.5 text-sm text-navy focus:outline-none focus:bg-white focus:border-navy/30"/>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-[#6b7385] block mb-1.5">Categoría</label>
            <Select value={category} onChange={setCategory}
              options={[{value:"",label:"Sin categoría"}, ...CATEGORY_OPTIONS.map(c => ({value:c.toLowerCase(),label:c}))]}
              className="w-full bg-stone border border-transparent rounded-xl px-3 py-2.5 text-sm text-navy text-left focus:outline-none focus:bg-white focus:border-navy/30"/>
          </div>

          {profiles.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-[#6b7385] block mb-1.5">Asignado a</label>
              <Select value={assignedTo} onChange={setAssignedTo}
                options={profiles.map(p => ({value:p.id,label:p.full_name || "Sin nombre"}))}
                className="w-full bg-stone border border-transparent rounded-xl px-3 py-2.5 text-sm text-navy text-left focus:outline-none focus:bg-white focus:border-navy/30"/>
            </div>
          )}

          {err && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2">{err}</p>}

          {task && (
            <button onClick={() => onDelete(task.id)} className="text-xs text-red-400 hover:text-red-600 transition">
              Eliminar tarea
            </button>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 bg-stone text-navy font-medium py-3 rounded-full hover:bg-stone-dk transition text-sm">
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

function TaskCard({ task, onEdit, onToggleDone }: {
  task: Task;
  onEdit: (t: Task) => void;
  onToggleDone: (t: Task) => void;
}) {
  const overdue = isOverdue(task);
  const subtitulo = task.lead?.name || task.assignee?.full_name?.split(" ")[0] || task.category || "";

  return (
    <div onClick={() => onEdit(task)}
      className="bg-white rounded-[20px] p-3.5 flex items-center gap-3 cursor-pointer hover:shadow-float transition">
      <button onClick={e => { e.stopPropagation(); onToggleDone(task); }}
        className={`w-5 h-5 rounded-full border-2 shrink-0 transition ${
          task.status === "done" ? "bg-navy border-navy" : overdue ? "border-red-400" : "border-stone-dk"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug truncate ${task.status === "done" ? "line-through text-[#6b7385]" : "text-navy"}`}>
          {task.title}
        </p>
        {subtitulo && <p className="text-xs text-[#6b7385] truncate mt-0.5">{subtitulo}</p>}
      </div>
      {task.due_at && (
        <span className={`text-[11px] shrink-0 ${overdue && task.status !== "done" ? "text-red-500 font-semibold" : "text-[#6b7385]"}`}>
          {formatDate(task.due_at)}
        </span>
      )}
      <PriorityBadge p={task.priority}/>
    </div>
  );
}

function BoardView({ tasks, onEdit, onToggleDone }: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onToggleDone: (t: Task) => void;
}) {
  const hoy = meridaParts(new Date()).ymd;
  const limiteSemana = addDaysYmd(hoy, 7);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {DATE_COLS.map(col => {
        const colTasks = tasks.filter(t => dueBucket(t, hoy, limiteSemana) === col);
        return (
          <div key={col} className="bg-cream rounded-[28px] p-4">
            <p className="font-serif text-navy text-xl mb-3">{DATE_COL_LABEL[col]}</p>
            <div className="space-y-2.5">
              {colTasks.length === 0 && <p className="text-xs text-[#6b7385] text-center py-6">Sin tareas</p>}
              {colTasks.map(t => <TaskCard key={t.id} task={t} onEdit={onEdit} onToggleDone={onToggleDone}/>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ tasks, onEdit, onToggleDone }: {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onToggleDone: (t: Task) => void;
}) {
  return (
    <div className="space-y-2">
      {tasks.length === 0 && <div className="text-center py-16"><p className="text-sm text-[#6b7385]">No hay tareas que coincidan.</p></div>}
      {tasks.map(t => <TaskCard key={t.id} task={t} onEdit={onEdit} onToggleDone={onToggleDone}/>)}
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
    setShowModal(false);
  }

  async function handleStatusChange(id: string, status: Task["status"]) {
    const res  = await fetch(`/api/tareas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, completed_at: status === "done" ? new Date().toISOString() : null }),
    });
    const data = await res.json();
    if (data.task) handleSave(data.task);
  }

  function handleToggleDone(t: Task) {
    handleStatusChange(t.id, t.status === "done" ? "todo" : "done");
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

        <div className="flex items-center bg-stone rounded-full p-1 text-xs">
          {(["kanban","list"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-full font-medium transition ${view===v?"bg-navy text-white":"text-[#6b7385] hover:text-navy"}`}>
              {v === "kanban" ? "Tablero" : "Lista"}
            </button>
          ))}
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar tarea..."
          className="bg-stone rounded-full px-4 py-2 text-sm text-navy placeholder:text-[#6b7385]/60 focus:outline-none focus:bg-white flex-1 min-w-[160px]"/>

        <Select value={filterPrio} onChange={setFilterPrio}
          options={[{value:"all",label:"Todas las prioridades"},{value:"urgent",label:"Urgente"},{value:"high",label:"Alta"},{value:"normal",label:"Normal"},{value:"low",label:"Baja"}]}
          className="bg-stone rounded-full px-4 py-2 text-sm text-navy text-left focus:outline-none"/>

        <Select value={filterCat} onChange={setFilterCat}
          options={[{value:"all",label:"Todas las categorías"}, ...CATEGORY_OPTIONS.map(c => ({value:c.toLowerCase(),label:c}))]}
          className="bg-stone rounded-full px-4 py-2 text-sm text-navy text-left focus:outline-none"/>
      </div>

      {view === "kanban"
        ? <BoardView tasks={filtered} onEdit={openEdit} onToggleDone={handleToggleDone}/>
        : <ListView  tasks={filtered} onEdit={openEdit} onToggleDone={handleToggleDone}/>
      }

      {showModal && (
        <TaskModal
          task={editTask}
          profiles={profiles}
          currentUserId={currentUserId}
          leadId={leadId}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
