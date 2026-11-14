-- Activa la seguridad por filas (RLS) en las tablas que la tenían apagada.
-- Con RLS apagado, las políticas NO se aplican: cualquiera con la llave pública
-- (que va dentro del sitio) podía leer y modificar finanzas, chats y citas.
-- Idempotente: se puede correr más de una vez. Deshacer: supabase/rollback/20261113000000_activar_rls.sql

-- 1. Encender RLS. Las políticas que ya existían empiezan a aplicarse.
do $$
declare t text;
begin
  foreach t in array array[
    'activities','appointments','board_properties','boards','budgets','business_settings',
    'cash_movements','chatbot_messages','chatbot_sessions','cuentas_por_pagar','deals','expenses',
    'financial_goals','financial_history','marketing_spend','operations','property_inquiries',
    'property_notes','property_views','visits']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- 2. appointments (tabla vieja, el código ya no la usa): tenía lectura y escritura
--    para cualquiera, con nombre, teléfono y correo de clientes. Solo personal.
drop policy if exists appointments_select on public.appointments;
drop policy if exists appointments_insert on public.appointments;
drop policy if exists appointments_update on public.appointments;
drop policy if exists appointments_staff on public.appointments;
create policy appointments_staff on public.appointments
  for all to authenticated using (true) with check (true);

-- 3. Sesiones del chat: cualquiera podía modificarlas. El sitio las escribe desde el servidor.
drop policy if exists "chatbot sessions update public" on public.chatbot_sessions;

-- 4. Tableros: lectura pública de todos. La página pública los lee desde el servidor.
drop policy if exists boards_public_read on public.boards;
drop policy if exists bp_public_read on public.board_properties;

-- 5. Cuentas por pagar y metas: solo administradores (como el resto de finanzas).
drop policy if exists "Autenticados pueden todo" on public.cuentas_por_pagar;
drop policy if exists cxp_admin on public.cuentas_por_pagar;
create policy cxp_admin on public.cuentas_por_pagar
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
drop policy if exists "Auth CRUD financial_goals" on public.financial_goals;
drop policy if exists auth_goals on public.financial_goals;
drop policy if exists goals_admin on public.financial_goals;
create policy goals_admin on public.financial_goals
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- 6. Perfiles: un usuario podía cambiarse su propio rol a admin desde el navegador
--    (la política "update own" no limita columnas). Solo un admin, o el servidor
--    (Ajustes → Equipo usa la llave de servicio), cambia rol o estado.
create or replace function public.proteger_rol_perfil() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() es null para el servidor (service role) y el SQL Editor
  if auth.uid() is not null and not public.es_admin() then
    if tg_op = 'INSERT' and new.role = 'admin' then
      raise exception 'Solo un administrador puede crear administradores';
    end if;
    if tg_op = 'UPDATE' and (new.role is distinct from old.role or new.active is distinct from old.active) then
      raise exception 'Solo un administrador puede cambiar el rol o el estado de un usuario';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists proteger_rol_perfil on public.profiles;
create trigger proteger_rol_perfil before insert or update on public.profiles
  for each row execute function public.proteger_rol_perfil();
