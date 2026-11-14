-- DESHACER 20261114000000_propiedades_escritura.sql (el CRM vuelve a no poder guardar propiedades).
drop policy if exists properties_personal_select on public.properties;
drop policy if exists properties_personal_insert on public.properties;
drop policy if exists properties_personal_update on public.properties;
drop policy if exists properties_admin_delete on public.properties;
drop function if exists public.es_personal();
