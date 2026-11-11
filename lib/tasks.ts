// lib/tasks.ts
// Campos de tareas que el cliente puede escribir. Antes se hacía insert({...body}),
// lo que permitía escribir cualquier columna (created_by, ids, etc.).

export const TASK_SELECT = "*, assignee:profiles!assigned_to(id, full_name, initials), lead:leads(id, name)";

const STATUSES   = ["todo", "in_progress", "done"];
const PRIORITIES = ["low", "normal", "high", "urgent"];
const STRING_FIELDS = ["title", "description", "category", "assigned_to", "lead_id", "starts_at", "due_at", "completed_at"] as const;

export function pickTaskFields(body: Record<string, unknown>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of STRING_FIELDS) {
    if (!(key in body)) continue;
    const v = body[key];
    if (v === null || v === "") out[key] = null;
    else if (typeof v === "string") out[key] = v.slice(0, key === "description" ? 5000 : 500);
  }
  if (typeof out.title === "string") out.title = out.title.trim();
  if (typeof body.status === "string" && STATUSES.includes(body.status)) out.status = body.status;
  if (typeof body.priority === "string" && PRIORITIES.includes(body.priority)) out.priority = body.priority;
  return out;
}
