-- Permite al personal del CRM crear y editar propiedades desde el panel.
-- La tabla tenía RLS con UNA sola regla (leer publicadas), así que el formulario
-- del CRM no podía guardar: Supabase actualizaba 0 filas sin dar error.
-- Idempotente. Deshacer: supabase/rollback/20261114000000_propiedades_escritura.sql

-- Personal activo del CRM (admin, asesor o asistente)
create or replace function public.es_personal() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'asesor', 'asistente') and coalesce(active, true)
  );
$$;

-- Ver todas (también las no publicadas): el formulario las necesita al crear y editar
drop policy if exists properties_personal_select on public.properties;
create policy properties_personal_select on public.properties
  for select to authenticated using (public.es_personal());

drop policy if exists properties_personal_insert on public.properties;
create policy properties_personal_insert on public.properties
  for insert to authenticated with check (public.es_personal());

drop policy if exists properties_personal_update on public.properties;
create policy properties_personal_update on public.properties
  for update to authenticated using (public.es_personal()) with check (public.es_personal());

-- Eliminar: solo administradores
drop policy if exists properties_admin_delete on public.properties;
create policy properties_admin_delete on public.properties
  for delete to authenticated using (public.es_admin());
