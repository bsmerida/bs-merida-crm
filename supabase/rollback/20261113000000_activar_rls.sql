-- DESHACER 20261113000000_activar_rls.sql (deja todo como estaba el 13 nov 2026).
-- Ojo: vuelve a dejar abiertas las tablas. Usar solo si algo dejó de funcionar.
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
      execute format('alter table public.%I disable row level security', t);
    end if;
  end loop;
end $$;

drop policy if exists appointments_staff on public.appointments;
create policy appointments_select on public.appointments for select to public using (true);
create policy appointments_insert on public.appointments for insert to public with check (true);
create policy appointments_update on public.appointments for update to public using (true);

create policy "chatbot sessions update public" on public.chatbot_sessions for update to public using (true);
create policy boards_public_read on public.boards for select to public using (true);
create policy bp_public_read on public.board_properties for select to public using (true);

drop policy if exists cxp_admin on public.cuentas_por_pagar;
create policy "Autenticados pueden todo" on public.cuentas_por_pagar for all to authenticated using (true) with check (true);
drop policy if exists goals_admin on public.financial_goals;
create policy "Auth CRUD financial_goals" on public.financial_goals for all to authenticated using (true) with check (true);
create policy auth_goals on public.financial_goals for all to authenticated using (true) with check (true);

drop trigger if exists proteger_rol_perfil on public.profiles;
drop function if exists public.proteger_rol_perfil();
