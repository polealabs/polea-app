-- Fase 2 de RLS: enforcement de ROL a nivel de base de datos.
--
-- Hasta ahora las tablas de negocio tenian una sola politica <t>_tenant_rls
-- (FOR ALL) que aislaba por tienda pero permitia a CUALQUIER miembro (incluido
-- readonly) leer y escribir. El rol solo se aplicaba en los server actions, asi
-- que un miembro con el anon key podia escribir directo via PostgREST saltandose
-- el gate. Esto parte esa politica en politicas POR COMANDO que codifican el rol:
--
--   SELECT          -> cualquier miembro de la tienda (get_tiendas_usuario)
--   INSERT/UPDATE   -> owner/admin/vendedor      (get_tiendas_editables)  [canEdit]
--   DELETE          -> owner/admin               (get_tiendas_admin)      [canDelete]
--
-- Excepcion: los sub-items de evento (evento_inventario/ventas/gastos) permiten
-- DELETE a editables, porque quitar una linea es parte del flujo de edicion del
-- vendedor (espeja la app: esas acciones usan requireEdit, no canDelete).
--
-- Sin cambios aqui: notificaciones y preferencias siguen como tenant (cualquier
-- miembro), porque se escriben desde lecturas del cliente y no son sensibles.
--
-- Residual conocido: la restriccion de "finanzas" (vendedor/readonly no ven
-- gastos/reportes) sigue siendo solo de la app. A nivel DB gastos es legible por
-- cualquier miembro (y editable por editables, necesario para el flujo de
-- entradas y el cierre de evento que insertan gastos).

-- ── Conjuntos de tiendas por permiso (SECURITY DEFINER, como get_tiendas_usuario) ──
CREATE OR REPLACE FUNCTION public.get_tiendas_editables()
RETURNS setof uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM tiendas WHERE owner_id = auth.uid()
  UNION
  SELECT tienda_id FROM miembros WHERE user_id = auth.uid() AND rol IN ('admin', 'vendedor')
$$;

CREATE OR REPLACE FUNCTION public.get_tiendas_admin()
RETURNS setof uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM tiendas WHERE owner_id = auth.uid()
  UNION
  SELECT tienda_id FROM miembros WHERE user_id = auth.uid() AND rol = 'admin'
$$;

GRANT EXECUTE ON FUNCTION public.get_tiendas_editables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tiendas_admin() TO authenticated;

DO $$
DECLARE
  t text;
  tablas_admin text[] := ARRAY[
    'productos','producto_variantes','producto_atributos',
    'entradas','ventas_cabecera','venta_items',
    'clientes','proveedores','medios_pago',
    'documentos','contadores_documentos','devoluciones_venta',
    'gastos',
    'tiendas_consignatarias','consignacion_salidas','consignaciones',
    'consignacion_movimientos','liquidaciones',
    'eventos','cuentas_por_pagar','cuotas_pago'
  ];
  tablas_edit_del text[] := ARRAY[
    'evento_inventario','evento_ventas','evento_gastos'
  ];
  tablas_all text[];
BEGIN
  tablas_all := tablas_admin || tablas_edit_del;

  -- SELECT / INSERT / UPDATE iguales para todas
  FOREACH t IN ARRAY tablas_all LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_rls', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (tienda_id IN (SELECT get_tiendas_usuario()))',
      t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (tienda_id IN (SELECT get_tiendas_editables()))',
      t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (tienda_id IN (SELECT get_tiendas_editables())) '
      || 'WITH CHECK (tienda_id IN (SELECT get_tiendas_editables()))',
      t || '_update', t);
  END LOOP;

  -- DELETE solo owner/admin
  FOREACH t IN ARRAY tablas_admin LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (tienda_id IN (SELECT get_tiendas_admin()))',
      t || '_delete', t);
  END LOOP;

  -- DELETE para editables (sub-items de evento: parte del flujo de edicion)
  FOREACH t IN ARRAY tablas_edit_del LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (tienda_id IN (SELECT get_tiendas_editables()))',
      t || '_delete', t);
  END LOOP;
END $$;
