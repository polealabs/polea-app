-- Tablas del sistema de soporte (widget de chat del dashboard + panel /polealabs/soporte).
--
-- El codigo las usa desde 2026-06 (app/(dashboard)/soporte/actions.ts y
-- app/polealabs/soporte/) pero nunca se habia creado la migracion, asi que en
-- produccion fallaba con "Could not find the table 'public.casos_soporte'".
--
-- RLS: tenant simple (cualquier miembro de la tienda puede leer/escribir sus
-- propios casos), tal como documenta CLAUDE.md seccion 5. El admin responde
-- desde /polealabs/soporte con createAdminClient() (service role), que bypassea
-- RLS, por eso no necesita politica propia. Idempotente.

CREATE TABLE IF NOT EXISTS public.casos_soporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id uuid NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  estado text NOT NULL DEFAULT 'abierto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mensajes_soporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id uuid NOT NULL REFERENCES public.casos_soporte(id) ON DELETE CASCADE,
  tienda_id uuid NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  autor text NOT NULL,
  mensaje text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_casos_soporte_tienda ON public.casos_soporte(tienda_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_soporte_caso ON public.mensajes_soporte(caso_id);

ALTER TABLE public.casos_soporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_soporte ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['casos_soporte','mensajes_soporte'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (tienda_id IN (SELECT get_tiendas_usuario()))',
      t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (tienda_id IN (SELECT get_tiendas_usuario()))',
      t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (tienda_id IN (SELECT get_tiendas_usuario())) '
      || 'WITH CHECK (tienda_id IN (SELECT get_tiendas_usuario()))',
      t || '_update', t);
  END LOOP;
END $$;
