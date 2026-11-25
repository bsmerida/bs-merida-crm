-- DESHACER 20261125000000_lecciones_por_fuente.sql
alter table public.agente_lecciones drop column if exists fuente_id;
