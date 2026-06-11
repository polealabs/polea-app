-- Restringe la lectura de `admins` a la propia fila del usuario.
-- Antes: USING (true) permitia a cualquier autenticado listar todos los emails
-- de admin (divulgacion de informacion). El gate de admin (proxy.ts y
-- verificarAdmin) solo consulta su propia fila con .eq('email', user.email),
-- y las paginas /polealabs usan service role (bypassea RLS), asi que esta
-- restriccion no rompe ningun flujo.

DROP POLICY IF EXISTS "admins_self_read" ON public.admins;

CREATE POLICY "admins_self_read" ON public.admins
  FOR SELECT
  USING ((auth.jwt() ->> 'email') = email);
