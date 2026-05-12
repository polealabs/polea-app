-- Tabla de administradores globales (Polea Labs).
-- Inserta filas manualmente en Supabase: email (único), nombre (opcional).

CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nombre text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_self_read" ON public.admins;
CREATE POLICY "admins_self_read" ON public.admins FOR SELECT USING (true);

GRANT SELECT ON public.admins TO authenticated;

COMMENT ON TABLE public.admins IS 'Emails con acceso a /polealabs (panel interno Polea).';
