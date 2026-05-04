-- Función que obtiene los tienda_ids del usuario actual sin referenciar tiendas desde miembros
create or replace function get_tiendas_usuario()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from tiendas where owner_id = auth.uid()
  union
  select tienda_id from miembros where user_id = auth.uid()
$$;

grant execute on function get_tiendas_usuario() to authenticated;
grant execute on function get_tiendas_usuario() to service_role;

-- Activar RLS en tiendas
alter table tiendas enable row level security;

-- Eliminar políticas anteriores si existen
drop policy if exists "tiendas_owner" on tiendas;
drop policy if exists "tiendas_miembros_read" on tiendas;
drop policy if exists "tiendas_owner_simple" on tiendas;
drop policy if exists "tiendas_miembro_simple" on tiendas;
drop policy if exists "tiendas_access" on tiendas;
drop policy if exists "tiendas_owner_all" on tiendas;
drop policy if exists "tiendas_rls" on tiendas;

-- Política única usando la función
create policy "tiendas_rls" on tiendas for all
  using (id in (select get_tiendas_usuario()))
  with check (owner_id = auth.uid());
