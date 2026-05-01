-- Ejecutar en Supabase si aún no existen las columnas.
alter table public.gastos add column if not exists tipo_gasto text;
alter table public.gastos add column if not exists subcategoria text;
