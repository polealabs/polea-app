-- Amplia el acceso RLS de las tablas de datos a los MIEMBROS de la tienda
-- (no solo al owner), usando la funcion existente get_tiendas_usuario()
-- (SECURITY DEFINER) que devuelve las tiendas del usuario como owner + miembro.
--
-- Contexto: hasta ahora las politicas de datos eran owner-only
-- (tienda_id IN (SELECT id FROM tiendas WHERE owner_id = auth.uid())), por lo
-- que los miembros invitados (admin/vendedor/readonly) no podian leer ni
-- escribir nada. El gate de ROLES (canEdit/canDelete/canViewFinanzas) se
-- aplica en los server actions (lib/tienda-server.ts); RLS solo hace el
-- aislamiento por tienda (multitenancy).
--
-- Es ADITIVA e IDEMPOTENTE: crea una politica con nombre propio (<tabla>_tenant_rls)
-- y solo elimina esa misma (DROP IF EXISTS de su propio nombre). No borra
-- politicas existentes, asi que no puede dejar a nadie sin acceso.
--
-- EXCLUIDAS a proposito:
--   - miembros / invitaciones: el flujo de aceptar invitacion inserta la
--     membresia cuando el usuario AUN no es miembro; una politica tenant
--     rompería ese insert. Conservan sus politicas actuales.
--   - suscripciones / cobros / metodos_pago_suscripcion / creditos_suscripcion:
--     facturacion, se mantienen owner-only.

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'productos','producto_variantes','producto_atributos',
    'entradas','ventas_cabecera','venta_items',
    'clientes','gastos','proveedores','medios_pago',
    'documentos','contadores_documentos','devoluciones_venta',
    'preferencias','notificaciones',
    'tiendas_consignatarias','consignacion_salidas','consignaciones',
    'consignacion_movimientos','liquidaciones',
    'eventos','evento_inventario','evento_ventas','evento_gastos',
    'cuentas_por_pagar','cuotas_pago'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_rls', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL '
      || 'USING (tienda_id IN (SELECT get_tiendas_usuario())) '
      || 'WITH CHECK (tienda_id IN (SELECT get_tiendas_usuario()))',
      t || '_tenant_rls', t
    );
  END LOOP;
END $$;
