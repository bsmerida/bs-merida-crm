-- Una lección aprendida de un rechazo podía ser específica de un proveedor
-- (ej. "esta Master Broker siempre pone el precio con IVA incluido") pero se
-- aplicaba a TODAS las fuentes por igual — ruido para las otras 50+. Ahora se
-- puede marcar como específica de la fuente donde se originó; nulo sigue
-- significando "aplica a todas", como antes.
-- Idempotente. Deshacer: supabase/rollback/20261125000000_lecciones_por_fuente.sql

alter table public.agente_lecciones
  add column if not exists fuente_id text references public.fuentes(id);
