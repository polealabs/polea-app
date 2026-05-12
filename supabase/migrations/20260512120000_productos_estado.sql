-- Estado de catálogo: activo (visible en ventas/alertas) | archivado
alter table public.productos
  add column if not exists estado text not null default 'activo';

alter table public.productos
  drop constraint if exists productos_estado_check;

alter table public.productos
  add constraint productos_estado_check check (estado in ('activo', 'archivado'));

comment on column public.productos.estado is 'activo: visible en ventas y alertas; archivado: oculto de selectores y sin alertas de inventario';
