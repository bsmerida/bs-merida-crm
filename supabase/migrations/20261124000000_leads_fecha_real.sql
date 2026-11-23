-- Fecha real en que llegó el cliente, distinta de created_at (cuándo se
-- guardó el registro en el sistema). Hace falta porque a veces se captura
-- información histórica en lote y created_at siempre es "hoy" — eso
-- distorsiona las estadísticas por periodo (parece que llegó un montón de
-- clientes este mes cuando en realidad son de meses pasados).
-- Idempotente. Deshacer: supabase/rollback/20261124000000_leads_fecha_real.sql

alter table public.leads
  add column if not exists lead_date date;

-- Para los leads que ya existen, created_at es la mejor estimación disponible.
update public.leads
  set lead_date = created_at::date
  where lead_date is null;
