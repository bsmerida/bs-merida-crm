-- DESHACER 20261124000000_leads_fecha_real.sql
alter table public.leads drop column if exists lead_date;
